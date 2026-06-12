"""Config 单元测试：默认值、就绪判断、minimax_raw_base 推导。"""
from config import Config


def test_minimax_raw_base_strips_anthropic_suffix():
    c = Config(minimax_base_url="https://api.minimaxi.com/anthropic")
    assert c.minimax_raw_base == "https://api.minimaxi.com"


def test_minimax_raw_base_without_suffix():
    c = Config(minimax_base_url="https://api.minimaxi.com/")
    assert c.minimax_raw_base == "https://api.minimaxi.com"


def test_minimax_ready_true_when_key_present():
    assert Config(minimax_api_key="sk-x").minimax_ready is True


def test_minimax_ready_false_when_empty():
    assert Config(minimax_api_key="").minimax_ready is False


def test_bailian_ready_requires_sk_prefix():
    assert Config(bailian_api_key="sk-824abc").bailian_ready is True
    # 旧的错误 key（非 sk- 开头）应判为未就绪
    assert Config(bailian_api_key="idSLMc123").bailian_ready is False
    assert Config(bailian_api_key="").bailian_ready is False
