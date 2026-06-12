"""pytest 公共夹具：构造测试用 Config 与 Flask test client。

所有外部 API 调用在各测试中以 mock 替换，单测离线可跑、不消耗额度。
"""
import sys
from dataclasses import replace
from pathlib import Path

import pytest

# 让测试能 import backend 包内模块（config / app / services）
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from config import Config  # noqa: E402
from app import create_app  # noqa: E402


@pytest.fixture
def cfg():
    """固定的测试配置，避免依赖真实 .env。"""
    return Config(
        minimax_api_key="sk-test-minimax",
        minimax_base_url="https://api.minimaxi.com/anthropic",
        minimax_llm_model="MiniMax-M3",
        minimax_image_model="image-01-live",
        bailian_api_key="sk-test-bailian",
        bailian_asr_model="paraformer-realtime-v2",
        allowed_origins="http://localhost:5173",
    )


@pytest.fixture
def client(cfg):
    app = create_app(cfg)
    app.testing = True
    return app.test_client()
