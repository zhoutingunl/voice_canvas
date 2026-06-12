"""后端配置：从项目根 .env 读取凭据与服务参数。

纯标准库解析 .env（无需 python-dotenv），缺失项回退到默认值。
密钥只存在于 .env（已 gitignore），绝不进入仓库。
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """把 .env 的键值灌入 os.environ（已存在的环境变量优先，不覆盖）。"""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


_load_dotenv(PROJECT_ROOT / ".env")


def _get(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


@dataclass
class Config:
    # MiniMax（LLM 指令解析 + 实体生图）
    minimax_api_key: str = field(default_factory=lambda: _get("MINIMAX_API_KEY"))
    minimax_base_url: str = field(default_factory=lambda: _get("MINIMAX_BASE_URL", "https://api.minimaxi.com/anthropic"))
    minimax_llm_model: str = field(default_factory=lambda: _get("MINIMAX_LLM_MODEL", "MiniMax-M3"))
    minimax_image_model: str = field(default_factory=lambda: _get("MINIMAX_IMAGE_MODEL", "image-01-live"))

    # 阿里百炼（云端 ASR）
    bailian_api_key: str = field(default_factory=lambda: _get("BAILIAN_API_KEY"))
    bailian_asr_model: str = field(default_factory=lambda: _get("BAILIAN_ASR_MODEL", "paraformer-realtime-v2"))

    # 服务
    host: str = field(default_factory=lambda: _get("FLASK_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(_get("FLASK_PORT", "5001")))
    allowed_origins: str = field(default_factory=lambda: _get("ALLOWED_ORIGINS", "http://localhost:5173"))
    timeout: int = 60

    @property
    def minimax_raw_base(self) -> str:
        """去掉 /anthropic 后缀，得到 MiniMax 原始域名（生图等非 Anthropic 兼容端点用）。"""
        base = self.minimax_base_url.rstrip("/")
        if base.endswith("/anthropic"):
            base = base[: -len("/anthropic")]
        return base

    @property
    def minimax_ready(self) -> bool:
        return bool(self.minimax_api_key)

    @property
    def bailian_ready(self) -> bool:
        return bool(self.bailian_api_key) and self.bailian_api_key.startswith("sk-")


def get_config() -> Config:
    return Config()
