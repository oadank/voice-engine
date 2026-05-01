#!/bin/sh
# Voice Engine ASR 转写
# 用法: transcribe.sh <audio_file>
# 输出: 纯文本到 stdout
# 依赖: ffmpeg, sherpa-onnx-offline, node（标点恢复）

INPUT="$1"
if [ -z "$INPUT" ]; then
  echo "用法: transcribe.sh <audio_file>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="/tmp/openclaw"
WAV="$TMP/asr_input.wav"
MODEL="/sherpa-onnx/models/sensevoice-int8"
BIN="/sherpa-onnx/bin"

mkdir -p "$TMP"
export LD_LIBRARY_PATH="/sherpa-onnx/lib:${LD_LIBRARY_PATH}"

# 1. 转 16kHz 单声道 WAV
"$BIN/ffmpeg" -y -i "$INPUT" -ar 16000 -ac 1 -f wav "$WAV" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "[转码失败]" >&2
  exit 1
fi

# 2. ASR 识别
OUTPUT=$("$BIN/sherpa-onnx-offline" \
  "--tokens=$MODEL/tokens.txt" \
  "--sense-voice-model=$MODEL/model.int8.onnx" \
  "--num-threads=2" \
  "--provider=cpu" \
  "$WAV" 2>&1)

# 3. 提取 text 字段（sed 提取 JSON 中的 text 值）
TEXT=""
for line in $OUTPUT; do
  case "$line" in
    *'"text"'*)
      TEXT=$(echo "$line" | sed 's/.*"text"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
      if [ -n "$TEXT" ] && [ "$TEXT" != "$line" ]; then
        break
      fi
      ;;
  esac
done

if [ -z "$TEXT" ]; then
  echo "[ASR 无结果]" >&2
  rm -f "$WAV"
  exit 1
fi

# 4. 标点恢复（Node.js，零 Python 依赖）
PUNCTUATED=$(node "$SCRIPT_DIR/add-punctuation.mjs" "$TEXT" 2>/dev/null)
if [ -n "$PUNCTUATED" ]; then
  echo "$PUNCTUATED"
else
  echo "$TEXT"
fi

# 5. 清理
rm -f "$WAV"
