"""MiniMaxLLM 单元测试：JSON 抽取的鲁棒性 + parse_command（mock 网络）。"""
from unittest.mock import MagicMock, patch

import pytest

from services.minimax_llm import MiniMaxLLM, MiniMaxLLMError, _extract_json_array


# ---------- _extract_json_array 鲁棒性 ----------

def test_extract_plain_array():
    assert _extract_json_array('[{"op":"clear"}]') == [{"op": "clear"}]


def test_extract_with_code_fence():
    txt = '```json\n[{"op":"create","id":"c1"}]\n```'
    assert _extract_json_array(txt) == [{"op": "create", "id": "c1"}]


def test_extract_with_surrounding_noise():
    txt = '好的，结果如下：[{"op":"undo"}] 完成'
    assert _extract_json_array(txt) == [{"op": "undo"}]


def test_extract_single_object_wrapped_to_list():
    assert _extract_json_array('{"op":"redo"}') == [{"op": "redo"}]


def test_extract_invalid_raises():
    with pytest.raises(MiniMaxLLMError):
        _extract_json_array("这里没有任何 JSON")


# ---------- parse_command（mock requests.post）----------

def _fake_resp(status=200, content_text='[{"op":"create","id":"c1","kind":"shape","shape":"circle"}]'):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = {"content": [{"type": "text", "text": content_text}],
                              "usage": {"input_tokens": 10, "output_tokens": 5}}
    resp.text = content_text
    return resp


def test_parse_command_success(cfg):
    llm = MiniMaxLLM(cfg)
    with patch("services.minimax_llm.requests.post", return_value=_fake_resp()) as p:
        out = llm.parse_command("画一个圆")
    assert out["commands"][0]["shape"] == "circle"
    # 校验请求带了正确鉴权头与端点
    _, kwargs = p.call_args
    assert kwargs["headers"]["x-api-key"] == "sk-test-minimax"
    assert p.call_args[0][0].endswith("/v1/messages")


def test_parse_command_empty_text_raises(cfg):
    with pytest.raises(MiniMaxLLMError):
        MiniMaxLLM(cfg).parse_command("   ")


def test_parse_command_http_error_raises(cfg):
    llm = MiniMaxLLM(cfg)
    with patch("services.minimax_llm.requests.post", return_value=_fake_resp(status=401)):
        with pytest.raises(MiniMaxLLMError):
            llm.parse_command("画一个圆")


def test_parse_command_requires_key():
    from config import Config
    llm = MiniMaxLLM(Config(minimax_api_key=""))
    with pytest.raises(MiniMaxLLMError):
        llm.parse_command("画一个圆")
