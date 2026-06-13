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


def _img_get(status=200, content=b"\xff\xd8\xff\xe0jpegbytes", ctype="image/jpeg"):
    r = MagicMock()
    r.status_code = status
    r.content = content
    r.headers = {"Content-Type": ctype}
    return r


def test_generate_returns_urls_and_base64(cfg):
    img = MiniMaxImage(cfg)
    with patch("services.minimax_image.requests.post", return_value=_resp()) as p, \
         patch("services.minimax_image.requests.get", return_value=_img_get()):
        out = img.generate("一只加菲猫，卡通风")
    assert out["urls"] == ["https://cdn.example/cat.png"]
    # 服务端转 base64：用于前端 data URI 渲染 + 可导出
    assert out["image_base64"]
    assert out["mime"] == "image/jpeg"
    _, kwargs = p.call_args
    assert kwargs["headers"]["Authorization"] == "Bearer sk-test-minimax"
    assert p.call_args[0][0].endswith("/v1/image_generation")
    assert "/anthropic/" not in p.call_args[0][0]


def test_generate_base64_unavailable_falls_back_to_urls(cfg):
    img = MiniMaxImage(cfg)
    with patch("services.minimax_image.requests.post", return_value=_resp()), \
         patch("services.minimax_image.requests.get", return_value=_img_get(status=403)):
        out = img.generate("x")
    assert out["urls"] == ["https://cdn.example/cat.png"]
    assert "image_base64" not in out


def test_generate_empty_prompt_raises(cfg):
    with pytest.raises(MiniMaxImageError):
        MiniMaxImage(cfg).generate("  ")


def test_generate_base_resp_error_raises(cfg):
    bad = {"data": {}, "base_resp": {"status_code": 1004, "status_msg": "auth failed"}}
    with patch("services.minimax_image.requests.post", return_value=_resp(payload=bad)):
        with pytest.raises(MiniMaxImageError):
            MiniMaxImage(cfg).generate("x")


def test_generate_base64_direct_from_payload(cfg):
    # MiniMax 直接返回 image_base64（无 url）时，原样透传
    payload = {"data": {"image_base64": "AAAA"}, "base_resp": {"status_code": 0}}
    with patch("services.minimax_image.requests.post", return_value=_resp(payload=payload)):
        out = MiniMaxImage(cfg).generate("x")
    assert out["image_base64"] == "AAAA"
