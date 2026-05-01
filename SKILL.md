---
name: voice-engine
description: "语音引擎：ASR（语音识别）+ TTS（语音合成）。用户发语音、要求语音回复、或需要朗读内容时使用。支持 4 个 TTS 服务商自动回退，以及 sherpa-onnx 本地语音识别。配置从 openclaw.json 读取。"
version: 2.1.0
---

# Voice Engine - 语音引擎

**版本：** 2.1.0（通用版，2026-05-01）

---

## 规则

1. 用户发语音，AI 必须语音回复
2. 用户发文字，AI 自主决定语音或文本回复
3. 用户发文字要求回语音，AI 必须回语音

---

## 能力

### ASR（语音识别）
- **引擎：** sherpa-onnx SenseVoice INT8
- **支持语言：** 中文、英文、日文、韩文、粤语
- **运行方式：** 本地离线运行
- **采样率：** 16kHz 单声道
- **调用：** `bash ${SKILL_DIR}/transcribe.sh <音频文件>`

### TTS（语音合成）
- **服务商：** 4 合 1 自动回退
  1. 小米 MiMo（主用）— 云 API
  2. 微软 Edge TTS — Node.js 原生 WebSocket + DRM 令牌（edge-tts.mjs）
  3. wangwangit — 云 API
  4. 阿里云 Qwen3 — 云 API
- **渠道感知转码：** 自动按目标渠道输出格式
  - 飞书 → OPUS（16kHz, 24kbps）
  - 微信 → MP3（16kHz, 48kbps）
  - Telegram → OPUS
- **调用：** 内置 `tts` 工具自动走技能覆盖（tts.yaml），无需手动调用
- **配置：** 统一从 `/root/.openclaw/openclaw.json` → `messages.tts.providers` 读取

### 工具覆盖
- `tools/tts.yaml` 覆盖系统内置 `tts` 工具
- handler: `node ${SKILL_DIR}/tts-wrapper.mjs`
- 配置统一从 `/root/.openclaw/openclaw.json` 读取

---

## 外部依赖（需单独安装）

本技能本身是纯代码（Node.js + Shell），**零 Python 依赖**。以下依赖需要预装：

| 依赖 | 用途 | 必需 | 推荐版本 | 下载地址 |
|------|------|------|---------|---------|
| **sherpa-onnx** | ASR 引擎 | ✅ | v1.12+ | https://github.com/k2-fsa/sherpa-onnx/releases |
| **SenseVoice 模型** | ASR 模型（INT8） | ✅ | - | https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models |
| **ffmpeg** | 音频转码 | ✅ | 6.0+ | `apt install ffmpeg` 或 https://johnvansickle.com/ffmpeg/ |
| **ws** (npm) | WebSocket 客户端 | ✅ | 8+ | `npm install ws`（已内置在技能目录） |
| **Node.js** | 运行时 | ✅ | 18+ | 系统内置 |

> **不需要：** Python3、jieba、edge-tts-api。全部用 Node.js 实现。

### sherpa-onnx 平台选择

sherpa-onnx 提供多个平台的预编译包。根据你的系统选择：

| 平台 | 文件名模式 | 说明 |
|------|-----------|------|
| **Linux x64** | `sherpa-onnx-*-linux-x64-shared.tar.bz2` | 推荐，N5105 等 Intel/AMD 服务器 |
| Linux ARM64 | `sherpa-onnx-*-linux-aarch64-shared.tar.bz2` | 树莓派、Apple Silicon Linux |
| macOS x64 | `sherpa-onnx-*-osx-x64-shared.tar.bz2` | Intel Mac |
| macOS ARM64 | `sherpa-onnx-*-osx-arm64-shared.tar.bz2` | Apple Silicon Mac (M1/M2/M3) |
| Windows x64 | `sherpa-onnx-*-win-x64-shared.tar.bz2` | Windows |

**安装步骤（Linux x64）：**
```bash
# 1. 下载 sherpa-onnx 预编译包
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.1/sherpa-onnx-v1.12.1-linux-x64-shared.tar.bz2
tar xvf sherpa-onnx-v1.12.1-linux-x64-shared.tar.bz2

# 2. 下载 SenseVoice INT8 模型（229MB，支持中英日韩粤）
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-12-int8.tar.bz2
tar xvf sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-12-int8.tar.bz2

# 3. 整理到 /sherpa-onnx/ 目录
```

### sherpa-onnx 目录结构

```
/sherpa-onnx/
├── bin/
│   ├── sherpa-onnx-offline             # ASR 二进制
├── lib/                                # LD_LIBRARY_PATH 需包含此目录
│   ├── libsherpa-onnx-core.so
│   ├── libsherpa-onnx-cxx-api.so
│   └── ...
├── models/
│   └── sensevoice-int8/
│       ├── model.int8.onnx             # INT8 模型（229MB）
│       └── tokens.txt                  # 词表
└── tmp/
```

### ffmpeg 说明

ffmpeg 是独立依赖，sherpa-onnx 官方发布包**不包含** ffmpeg。安装方式：
```bash
apt install ffmpeg    # Debian/Ubuntu
```

### TTS 服务说明

| 提供商 | 类型 | 说明 |
|--------|------|------|
| 小米 MiMo | 云 API | 直接调用 api.xiaomimimo.com，无需本地服务 |
| 微软 Edge TTS | Node.js 原生 | edge-tts.mjs 内置 DRM 令牌 + WebSocket，无需额外服务 |
| wangwangit | 云 API | 直接调用 tts.wangwangit.com，无需本地服务 |
| 阿里云 Qwen3 | 云 API | 直接调用 dashscope.aliyuncs.com，无需本地服务 |

> **小米 MiMo TTS 限时免费**：小米 TTS 目前限时免费，未来可能收费。收费后建议将默认切换为微软 Edge TTS。
> 详见 https://platform.xiaomimimo.com/static/docs/pricing.md
>
> **阿里云免费额度有限**：阿里云 Qwen3 TTS 有免费额度，超额后按量收费。
>
> **微软 Edge TTS 原理：** 使用与 Microsoft Edge 浏览器"大声朗读"相同的 WebSocket API。
> 通过 DRM 模块生成 `Sec-MS-GEC` 安全令牌（SHA256），对齐 Python edge-tts v7.2.8 的实现。
> 免费，但微软可能随时调整 API。
>
> **wangwangit / VoiceCraft**：免费 TTS 平台，90+ 音色，8 种语言。官网 https://tts.wangwangit.com

### openclaw.json TTS 配置

```json
{
  "messages": {
    "tts": {
      "provider": "openai",
      "providers": {
        "openai": {
          "apiKey": "小米 API Key",
          "baseUrl": "https://api.xiaomimimo.com/v1",
          "model": "mimo-v2-tts",
          "voice": "default_zh"
        },
        "microsoft": {
          "enabled": true,
          "voice": "zh-CN-XiaoxiaoNeural"
        },
        "wangwang": {
          "enabled": true,
          "url": "https://tts.wangwangit.com/v1/audio/speech",
          "voice": "zh-CN-XiaoxiaoNeural",
          "speed": 1.2
        },
        "ali": {
          "enabled": true,
          "apiKey": "阿里云 API Key",
          "baseUrl": "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
          "voice": "Cherry"
        }
      }
    }
  }
}
```

### 渠道语音格式要求

AI 调用 TTS 时，tts-wrapper.mjs 会根据当前渠道自动选择输出格式。以下是各渠道的要求：

| 渠道 | 推荐格式 | 说明 |
|------|---------|------|
| **飞书** | OPUS | `.opus` / `.ogg` |
| **Telegram** | OPUS | 支持 `.ogg` / `.opus` / `.mp3` / `.m4a` |
| **WhatsApp** | OPUS | `audio/ogg; codecs=opus`，48kHz，64kbps |
| **QQ** | OPUS | 自动转 SILK，支持直接上传多种格式 |
| **Discord** | OPUS | 标准音频格式 |
| **微信** | MP3 | `.mp3` 格式 |
| **Signal** | OPUS | `.ogg` / `.opus` |
| **LINE** | OPUS | 音频消息 |
| **BlueBubbles** | MP3 | `.mp3` / `.caf`（iMessage 语音备忘录） |
| **Slack** | OPUS | 标准音频格式 |
| **Matrix** | OPUS | 标准音频格式 |
| **Mattermost** | OPUS | 标准音频格式 |
| **Teams** | OPUS | 标准音频格式 |

> OpenClaw 通用语音兼容格式：`.oga` `.ogg` `.opus` `.mp3` `.m4a`

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `SKILL.md` | 技能定义（本文件） |
| `tts-wrapper.mjs` | **核心** - Node.js TTS 包装器，读 openclaw.json，4 提供商自动回退 + ffmpeg 转码 |
| `edge-tts.mjs` | 微软 Edge TTS 客户端，DRM 令牌 + WebSocket，对齐 Python edge-tts v7.2.8 |
| `tools/tts.yaml` | 工具覆盖定义，把内置 `tts` 路由到 Node.js wrapper |
| `transcribe.sh` | ASR 转写入口（ffmpeg + sherpa-onnx + 标点恢复） |
| `add-punctuation.mjs` | 中文标点恢复（Node.js，纯正则，零依赖） |

---

## 工作原理

```
用户发语音
    ↓
OpenClaw 调用 transcribe.sh
    ↓
ffmpeg 转 16kHz WAV → sherpa-onnx ASR → sed 提取文本 → node 标点恢复
    ↓
AI 生成回复文字
    ↓
调用内置 tts 工具 → 技能 tts.yaml 覆盖
    ↓
node tts-wrapper.mjs → 读 openclaw.json 配置
    ↓
小米→微软(edge-tts.mjs)→万旺→阿里 自动回退 → ffmpeg 转码 OPUS/MP3
    ↓
OpenClaw 投递到飞书/微信/Telegram
```
