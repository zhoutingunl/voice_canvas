"""MiniMaxImage 单元测试：成功取 url / base_resp 错误 / 空 prompt（mock 网络）。"""
from unittest.mock import MagicMock, patch

import pytest

from services.minimax_image import MiniMaxImage, MiniMaxImageError


def _resp(status=200, payload=None):
    r = MagicMock()
    r.status_code = status
    r.json.return_value = payload or {
        "data": {"image_urls": ["https://cdn.example/cat.png"]},
        "base_resp": {"status_code": 0, "status_msg": "success"},
    }
    r.text = str(payload)
    return r


def test_generate_returns_urls(cfg):
    img = MiniMaxImage(cfg)
    with patch("services.minimax_image.requests.post", return_value=_resp()) as p:
        out = img.generate("一只加菲猫，卡通风")
    assert out["urls"] == ["https://cdn.example/cat.png"]
    _, kwargs = p.call_args
    assert kwargs["headers"]["Authorization"] == "Bearer sk-test-minimax"
    assert p.call_args[0][0].endswith("/v1/image_generation")
    # 端点应使用去掉 /anthropic 的原始域名
    assert "/anthropic/" not in p.call_args[0][0]


def test_generate_empty_prompt_raises(cfg):
    with pytest.raises(MiniMaxImageError):
        MiniMaxImage(cfg).generate("  ")


def test_generate_base_resp_error_raises(cfg):
    bad = {"data": {}, "base_resp": {"status_code": 1004, "status_msg": "auth failed"}}
    with patch("services.minimax_image.requests.post", return_value=_resp(payload=bad)):
        with pytest.raises(MiniMaxImageError):
            MiniMaxImage(cfg).generate("x")


def test_generate_base64_fallback(cfg):
    payload = {"data": {"image_base64": "AAAA"}, "base_resp": {"status_code": 0}}
    with patch("services.minimax_image.requests.post", return_value=_resp(payload=payload)):
        out = MiniMaxImage(cfg).generate("x")
    assert out["base64"] == "AAAA"
