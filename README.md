# Voice Engine - OpenClaw 语音引擎

> ASR + TTS 语音引擎，4 合 1 自动回退 + 渠道感知转码。**零 Python 依赖，纯 Node.js 实现。**

## 功能

- **ASR（语音识别）**：sherpa-onnx SenseVoice INT8，本地离线，支持中/英/日/韩/粤语
- **TTS（语音合成）**：4 合 1 自动回退（小米/微软 Edge/wangwangit/阿里云）
- **渠道感知转码**：根据当前渠道自动选择输出格式（飞书→OPUS，微信→MP3，WhatsApp→OPUS 等），未识别渠道默认 OPUS
- **配置统一**：全部从 `openclaw.json` 读取
- **内置 tts 工具覆盖**：通过 `tools/tts.yaml` 拦截 OpenClaw 内置 `tts` 工具调用，替换为本引擎

## 文件结构

| 文件 | 说明 |
|------|------|
| `SKILL.md` | 技能定义（规则 + 能力 + 外部依赖文档） |
| `tts-wrapper.mjs` | **核心** - 读取 openclaw.json 配置 + 4 提供商自动回退 + ffmpeg 渠道感知转码 + 输出音频文件 |
| `edge-tts.mjs` | 微软 Edge TTS（DRM 令牌 + WebSocket），**不是后台服务**，按需调用 |
| `tools/tts.yaml` | 覆盖 OpenClaw 内置 `tts` 工具 |
| `transcribe.sh` | ASR 入口（ffmpeg + sherpa-onnx） |
| `add-punctuation.mjs` | 中文标点恢复（纯正则规则，无分词工具） |

## 外部依赖

| 依赖 | 用途 | 安装 |
|------|------|------|
| sherpa-onnx + SenseVoice 模型 | ASR 引擎 | https://github.com/k2-fsa/sherpa-onnx/releases |
| ffmpeg | 音频转码 | 系统包管理器：`apt install ffmpeg` 或从 https://johnvansickle.com/ffmpeg/ 下载静态编译版 |
| Node.js 18+ | 运行时 | 系统内置 |
| ws (npm) | WebSocket 客户端 | `npm install ws`（已内置在技能目录） |

> **注意**：sherpa-onnx 官方发布包**不包含** ffmpeg，需要单独安装。

## 安装

```bash
# ⚠️ 必须克隆到 OpenClaw 技能目录，不要克隆到其他位置
cd ~/.openclaw/skills/
git clone https://github.com/oadank/voice-engine.git voice-engine
cd voice-engine && npm install ws
```

> **小白提示**：`~/.openclaw/skills/` 是 OpenClaw 的技能目录。克隆后重启 gateway 即可自动加载。

## openclaw.json 配置

TTS 配置在 `openclaw.json` → `messages.tts.providers`。四个 provider 全部可选，tts-wrapper.mjs 按顺序回退（小米→微软→万旺→阿里）：

```json
{
  "messages": {
    "tts": {
      "provider": "openai",
      "providers": {
        "openai": {
          "apiKey": "你的小米 API Key",
          "baseUrl": "https://api.xiaomimimo.com/v1",
          "model": "mimo-v2-tts",
          "voice": "冰糖"
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
          "apiKey": "你的阿里云 API Key",
          "baseUrl": "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
          "voice": "Cherry"
        }
      }
    }
  }
}
```

### ⚠️ 重要提示

| 提示 | 说明 |
|------|------|
| **小米 MiMo TTS 限时免费** | 小米 TTS 目前限时免费，未来可能收费。建议关注 [小米 MiMo 平台](https://platform.xiaomimimo.com) 的 pricing 页面，收费后将默认切换为微软 Edge TTS |
| **阿里云免费额度有限** | 阿里云 Qwen3 TTS 有免费额度，超额后按量收费。详见 [阿里云计费说明](https://help.aliyun.com/zh/model-studio/billing-overview) |
| **微软 Edge TTS 免费** | 微软 Edge TTS 是免费服务，但微软可能随时调整 API |
| **wangwangit 免费** | wangwangit（VoiceCraft）是免费 TTS 平台，90+ 音色，8 种语言 |

### 4 个服务商可选音色

#### ① 小米 MiMo（`providers.openai`）

> **模型说明**：当前使用 `mimo-v2-tts`。升级到 `mimo-v2.5-tts` 可获得更多功能（语音设计、语音克隆）。
> 详见 [小米 MiMo TTS 文档](https://platform.xiaomimimo.com/static/docs/usage-guide/speech-synthesis-v2.5.md)

**mimo-v2-tts 内置音色：**

| 音色 ID | 说明 |
|---------|------|
| `default_zh` | 默认中文 |
| `male_zh` | 男声中文 |
| `female_zh` | 女声中文 |

**mimo-v2.5-tts 内置音色（升级后可用）：**

| 音色 ID | 说明 | 语言 | 性别 |
|---------|------|------|------|
| `mimo_default` | 默认（中国区=冰糖） | 自动 | - |
| `冰糖` | 冰糖 | 中文 | 女 |
| `茉莉` | 茉莉 | 中文 | 女 |
| `苏打` | 苏打 | 中文 | 男 |
| `白桦` | 白桦 | 中文 | 男 |
| `Mia` | Mia | 英文 | 女 |
| `Chloe` | Chloe | 英文 | 女 |
| `Milo` | Milo | 英文 | 男 |
| `Dean` | Dean | 英文 | 男 |

> **V2.5 高级功能**：支持语音设计（`mimo-v2.5-tts-voicedesign`）和语音克隆（`mimo-v2.5-tts-voiceclone`），可通过文字描述自定义音色。

#### ②③ 微软 Edge TTS / wangwangit（`providers.microsoft` / `providers.wangwang`）

> **两者底层都是微软 Edge TTS 引擎**，音色列表完全相同。区别在于接入方式：
> - **微软**（`providers.microsoft`）：edge-tts.mjs 直连微软 WebSocket，不需要后台服务、不需要 API Key
> - **万旺**（`providers.wangwang`）：通过 [VoiceCraft](https://tts.wangwangit.com) 第三方网站中转，免费，90+ 音色

**中文音色：**

| 音色 ID | 说明 |
|---------|------|
| `zh-CN-XiaoxiaoNeural` | 晓晓（女，温柔）**默认** |
| `zh-CN-YunxiNeural` | 云希（男，清朗） |
| `zh-CN-YunyangNeural` | 云扬（男，阳光） |
| `zh-CN-XiaoyiNeural` | 晓伊（女，甜美） |
| `zh-CN-YunjianNeural` | 云健（男，稳重） |
| `zh-CN-XiaochenNeural` | 晓辰（女，知性） |
| `zh-CN-XiaohanNeural` | 晓涵（女，优雅） |
| `zh-CN-XiaomengNeural` | 晓梦（女，梦幻） |
| `zh-CN-XiaomoNeural` | 晓墨（女，文艺） |
| `zh-CN-XiaoqiuNeural` | 晓秋（女，成熟） |
| `zh-CN-XiaoruiNeural` | 晓睿（女，智慧） |
| `zh-CN-XiaoshuangNeural` | 晓双（女，活泼） |
| `zh-CN-XiaoxuanNeural` | 晓萱（女，清新） |
| `zh-CN-XiaoyanNeural` | 晓颜（女，柔美） |
| `zh-CN-XiaoyouNeural` | 晓悠（女，悠扬） |
| `zh-CN-XiaozhenNeural` | 晓甄（女，端庄） |
| `zh-CN-YunfengNeural` | 云枫（男，磁性） |
| `zh-CN-YunhaoNeural` | 云皓（男，豪迈） |
| `zh-CN-YunxiaNeural` | 云夏（男，热情） |
| `zh-CN-YunyeNeural` | 云野（男，野性） |
| `zh-CN-YunzeNeural` | 云泽（男，深沉） |
| `zh-TW-HsiaoChenNeural` | 晓晨（女，台湾腔） |
| `zh-TW-YunJheNeural` | 云哲（男，台湾腔） |
| `zh-TW-HsiaoYuNeural` | 晓雨（女，台湾腔） |
| `zh-HK-HiuGaaiNeural` | 晓佳（女，粤语） |
| `zh-HK-WanLungNeural` | 云龙（男，粤语） |
| `zh-HK-HiuMaanNeural` | 晓曼（女，粤语） |

#### ④ 阿里云 Qwen3（`providers.ali`）

> ⚠️ **免费额度有限，超额后按量收费。** 详见 [阿里云计费说明](https://help.aliyun.com/zh/model-studio/billing-overview)

| 音色 ID | 说明 |
|---------|------|
| `Cherry` | 樱桃（女）**默认** |
| `Ethan` | 伊森（男） |
| `Serena` | 塞蕾娜（女） |
| `Chelsie` | 切尔西（女） |

## 渠道语音格式要求

tts-wrapper.mjs 会根据当前渠道自动选择输出格式。以下是各渠道的要求：

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
| **其他渠道** | OPUS | 未识别渠道默认 OPUS |

> OpenClaw 通用语音兼容格式：`.oga` `.ogg` `.opus` `.mp3` `.m4a`

## 内置 tts 工具是什么？

OpenClaw 内置了一个 `tts` 工具，用于将文本转为语音。它读取 `openclaw.json` → `messages.tts` 的配置来决定用哪个 TTS 服务。

本引擎通过 `tools/tts.yaml` **覆盖**了这个内置工具。当 AI 调用 `tts` 工具时，OpenClaw 会优先执行 `tts.yaml` 里定义的 `tts-wrapper.mjs`，而不是走内置的 TTS 逻辑。

调用链路：
```
AI 调用内置 tts 工具
    ↓
OpenClaw 发现 tools/tts.yaml → 使用本引擎的 tts-wrapper.mjs
    ↓
tts-wrapper.mjs 读取 openclaw.json 配置
    ↓
小米→微软→万旺→阿里 自动回退
    ↓
tts-wrapper.mjs 根据渠道选择输出格式（飞书→OPUS，微信→MP3 等）
    ↓
ffmpeg 转码 → 输出音频文件
    ↓
OpenClaw 投递到对应渠道
```

## 指定服务商

通过 `tts.yaml` 的 `provider` 参数可以指定使用哪个服务商：

- `auto`（默认）：按顺序回退（小米→微软→万旺→阿里）
- `xiaomi` / `openai`：只用小米
- `microsoft`：只用微软
- `wangwang`：只用万旺
- `ali`：只用阿里

## ASR 流程

```
用户发语音 → transcribe.sh
    ↓
ffmpeg 转 16kHz 单声道 WAV
    ↓
sherpa-onnx SenseVoice INT8 离线识别
    ↓
add-punctuation.mjs 纯正则加标点
    ↓
输出文本 → AI 处理
```

## 许可

MIT License - 详见 [LICENSE](./LICENSE)
