# N5105 部署配置文件
# voice_skill_config.py

"""
飞书语音技能 - N5105 部署配置
此配置文件用于在 N5105 小主机上部署飞书语音技能

所有密钥从环境变量读取，不硬编码。
参考 .env.example 创建 .env 文件。
"""

import os

# 部署环境检测
def detect_deployment_environment():
    """检测部署环境并返回相应配置"""
    is_n5105 = os.path.exists("/sherpa-onnx/bin/ffmpeg") and os.path.exists("/sherpa-onnx/models/sensevoice-int8")

    if is_n5105:
        return get_n5105_config()
    else:
        return get_dev_config()

def get_n5105_config():
    """N5105 小主机配置"""
    return {
        # 飞书应用凭证（从环境变量读取）
        "FEISHU_APP_ID": os.environ.get("FEISHU_APP_ID", ""),
        "FEISHU_APP_SECRET": os.environ.get("FEISHU_APP_SECRET", ""),

        # 小米 MiMo TTS 配置（主用）
        "XIAOMI_API_KEY": os.environ.get("XIAOMI_API_KEY", ""),
        "XIAOMI_TTS_URL": "https://api.xiaomimimo.com/v1/chat/completions",
        "XIAOMI_SPEED": 1.2,
        "XIAOMI_VOICE": "default_zh",

        # 微软 Edge TTS 配置（备用 1）
        "MICROSOFT_VOICE": "zh-CN-XiaoxiaoNeural",
        "MICROSOFT_TTS_API": "http://host.docker.internal:19090/tts",

        # 阿里云 TTS 配置（备用）
        "ALIBABA_API_KEY": os.environ.get("ALIBABA_API_KEY", ""),
        "ALIBABA_VOICE": "longshu",
        "ALIBABA_BASE_URL": "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",

        # 模型路径配置（N5105 环境）
        "SHERPA_ONNX_PATH": "/sherpa-onnx",
        "SHERPA_ONNX_BIN_PATH": "/sherpa-onnx/bin",
        "SHERPA_ONNX_MODEL_PATH": "/sherpa-onnx/models/sensevoice-int8",
        "TEMP_DIR": "/sherpa-onnx/tmp",

        # 系统配置（针对 N5105 优化）
        "VOICE_REPLY_ENABLED": True,
        "AUDIO_FORMAT": "opus",
        "SAMPLE_RATE": 16000,
        "CHANNELS": 1,
        "FFMPEG_PATH": "/sherpa-onnx/bin/ffmpeg",
        "NUM_THREADS": 2,
        "MAX_RETRIES": 3,

        # 资源优化设置
        "MEMORY_OPTIMIZED": True,
        "LOW_POWER_MODE": True,
        "CACHE_ENABLED": False,

        # 微信渠道配置
        "WEIXIN_FORMAT": "mp3",

        # 临时文件管理（严格遵守覆盖模式）
        "TEMP_FILE_POLICY": "overwrite",
        "INPUT_TEMP_FILE": "/sherpa-onnx/tmp/input.opus",
        "OUTPUT_TEMP_FILE": "/sherpa-onnx/tmp/output.opus",
    }

def get_dev_config():
    """开发环境配置"""
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return {
        # 飞书应用凭证（从环境变量读取）
        "FEISHU_APP_ID": os.environ.get("FEISHU_APP_ID", ""),
        "FEISHU_APP_SECRET": os.environ.get("FEISHU_APP_SECRET", ""),

        # 小米 MiMo TTS 配置（主用）
        "XIAOMI_API_KEY": os.environ.get("XIAOMI_API_KEY", ""),
        "XIAOMI_TTS_URL": "https://api.xiaomimimo.com/v1/chat/completions",
        "XIAOMI_SPEED": 1.2,
        "XIAOMI_VOICE": "default_zh",

        # 微软 Edge TTS 配置（备用 1）
        "MICROSOFT_VOICE": "zh-CN-XiaoxiaoNeural",
        "MICROSOFT_PROXY": "http://127.0.0.1:7890",

        # 阿里云 TTS 配置（备用）
        "ALIBABA_API_KEY": os.environ.get("ALIBABA_API_KEY", ""),
        "ALIBABA_BASE_URL": "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",

        # 模型路径配置（开发环境，使用相对路径）
        "SHERPA_ONNX_PATH": os.path.join(base_path, "sherpa-onnx"),
        "SHERPA_ONNX_BIN_PATH": os.path.join(base_path, "sherpa-onnx", "bin"),
        "SHERPA_ONNX_MODEL_PATH": os.path.join(base_path, "sherpa-onnx", "models", "sensevoice-int8"),
        "TEMP_DIR": os.path.join(base_path, "sherpa-onnx", "tmp"),

        # 系统配置
        "VOICE_REPLY_ENABLED": True,
        "AUDIO_FORMAT": "opus",
        "SAMPLE_RATE": 16000,
        "CHANNELS": 1,
        "FFMPEG_PATH": os.path.join(base_path, "sherpa-onnx", "bin", "ffmpeg"),
        "NUM_THREADS": 4,
        "MAX_RETRIES": 3,

        # 开发环境设置
        "MEMORY_OPTIMIZED": False,
        "LOW_POWER_MODE": False,
        "CACHE_ENABLED": True,

        # 微信渠道配置
        "WEIXIN_FORMAT": "mp3",

        # 临时文件管理
        "TEMP_FILE_POLICY": "overwrite",
        "INPUT_TEMP_FILE": os.path.join(base_path, "sherpa-onnx", "tmp", "input.opus"),
        "OUTPUT_TEMP_FILE": os.path.join(base_path, "sherpa-onnx", "tmp", "output.opus"),
    }

def get_win_dev_config():
    """Windows 开发环境配置"""
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace("/", os.sep)
    return {
        # 飞书应用凭证（从环境变量读取）
        "FEISHU_APP_ID": os.environ.get("FEISHU_APP_ID", ""),
        "FEISHU_APP_SECRET": os.environ.get("FEISHU_APP_SECRET", ""),

        # 小米 MiMo TTS 配置（主用）
        "XIAOMI_API_KEY": os.environ.get("XIAOMI_API_KEY", ""),
        "XIAOMI_TTS_URL": "https://api.xiaomimimo.com/v1/chat/completions",
        "XIAOMI_SPEED": 1.2,
        "XIAOMI_VOICE": "default_zh",

        # 微软 Edge TTS 配置（备用 1）
        "MICROSOFT_VOICE": "zh-CN-XiaoxiaoNeural",
        "MICROSOFT_PROXY": "http://127.0.0.1:7890",

        # 阿里云 TTS 配置（备用）
        "ALIBABA_API_KEY": os.environ.get("ALIBABA_API_KEY", ""),
        "ALIBABA_BASE_URL": "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",

        # 模型路径配置（Windows 开发环境）
        "SHERPA_ONNX_PATH": os.path.join(base_path, "sherpa-onnx"),
        "SHERPA_ONNX_BIN_PATH": os.path.join(base_path, "sherpa-onnx", "bin"),
        "SHERPA_ONNX_MODEL_PATH": os.path.join(base_path, "sherpa-onnx", "models", "sensevoice-int8"),
        "TEMP_DIR": os.path.join(base_path, "sherpa-onnx", "tmp"),

        # 系统配置
        "VOICE_REPLY_ENABLED": True,
        "AUDIO_FORMAT": "opus",
        "SAMPLE_RATE": 16000,
        "CHANNELS": 1,
        "FFMPEG_PATH": os.path.join(base_path, "sherpa-onnx", "bin", "ffmpeg.exe"),
        "NUM_THREADS": 4,
        "MAX_RETRIES": 3,

        # 开发环境设置
        "MEMORY_OPTIMIZED": False,
        "LOW_POWER_MODE": False,
        "CACHE_ENABLED": True,

        # 微信渠道配置
        "WEIXIN_FORMAT": "mp3",

        # 临时文件管理
        "TEMP_FILE_POLICY": "overwrite",
        "INPUT_TEMP_FILE": os.path.join(base_path, "sherpa-onnx", "tmp", "input.opus"),
        "OUTPUT_TEMP_FILE": os.path.join(base_path, "sherpa-onnx", "tmp", "output.opus"),
    }

# 获取当前环境配置
def detect_and_get_config():
    """检测操作系统并返回合适的配置"""
    import platform

    is_n5105 = os.path.exists("/sherpa-onnx/bin/ffmpeg") and os.path.exists("/sherpa-onnx/models/sensevoice-int8")

    if is_n5105:
        return get_n5105_config()
    elif platform.system().lower() == "windows":
        return get_win_dev_config()
    else:
        return get_dev_config()

CURRENT_CONFIG = detect_and_get_config()

def get_config_value(key, default=None):
    """获取配置值"""
    return CURRENT_CONFIG.get(key, default)

def update_config(updates):
    """更新配置"""
    global CURRENT_CONFIG
    CURRENT_CONFIG.update(updates)

def validate_config():
    """验证配置的有效性"""
    required_keys = [
        "FEISHU_APP_ID",
        "FEISHU_APP_SECRET",
        "XIAOMI_API_KEY",
        "SHERPA_ONNX_MODEL_PATH",
        "TEMP_DIR"
    ]

    missing_keys = []
    for key in required_keys:
        if not CURRENT_CONFIG.get(key):
            missing_keys.append(key)

    if missing_keys:
        raise ValueError(f"缺少必需的配置项：{missing_keys}")

    model_path = CURRENT_CONFIG["SHERPA_ONNX_MODEL_PATH"]
    if os.path.exists(model_path):
        required_model_files = ["model.int8.onnx", "tokens.txt"]
        missing_models = []
        for model_file in required_model_files:
            if not os.path.exists(os.path.join(model_path, model_file)):
                missing_models.append(model_file)

        if missing_models:
            print(f"警告：缺少模型文件：{missing_models}")
    else:
        print(f"警告：模型路径不存在：{model_path}")

    return True

# 部署信息
def get_deployment_info():
    import platform
    return {
        "environment": "N5105" if os.path.exists("/sherpa-onnx/bin/ffmpeg") else f"{'Windows' if platform.system() == 'Windows' else platform.system()} Dev",
        "platform": platform.system(),
        "detected_features": {
            "sherpa_onnx_available": os.path.exists(CURRENT_CONFIG["SHERPA_ONNX_MODEL_PATH"]),
            "ffmpeg_available": os.path.exists(CURRENT_CONFIG["FFMPEG_PATH"]),
            "models_path_exists": os.path.exists(CURRENT_CONFIG["SHERPA_ONNX_MODEL_PATH"]),
            "temp_dir_writable": os.access(CURRENT_CONFIG["TEMP_DIR"], os.W_OK) if os.path.exists(CURRENT_CONFIG["TEMP_DIR"]) else False
        }
    }

DEPLOYMENT_INFO = get_deployment_info()

if __name__ == "__main__":
    print("飞书语音技能 - 配置检查")
    print("="*40)
    print(f"部署环境：{DEPLOYMENT_INFO['environment']}")
    print(f"操作系统：{DEPLOYMENT_INFO['platform']}")
    print("检测到的功能:")
    for feature, available in DEPLOYMENT_INFO['detected_features'].items():
        status = "✓" if available else "✗"
        print(f"  {status} {feature}: {available}")

    try:
        validate_config()
        print("✓ 配置验证通过")
    except ValueError as e:
        print(f"✗ 配置验证失败：{e}")

    print("="*40)
    print("当前配置:")
    for key, value in list(CURRENT_CONFIG.items())[:5]:
        print(f"  {key}: {value}")
