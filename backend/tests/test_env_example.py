"""回归保护：.env.example 的键名必须与 config.py 实际读取的一致。

防止再次出现 DASHSCOPE_API_KEY / 缺 /anthropic 之类导致首启即阻塞的错配。
"""
from pathlib import Path

ENV_EXAMPLE = Path(__file__).resolve().parent.parent.parent / ".env.example"


def _text() -> str:
    return ENV_EXAMPLE.read_text(encoding="utf-8")


def test_uses_bailian_not_dashscope():
    t = _text()
    assert "BAILIAN_API_KEY=" in t
    assert "DASHSCOPE_API_KEY=" not in t  # 旧的错配键名不应再出现


def test_minimax_base_url_keeps_anthropic_suffix():
    # 缺 /anthropic 会导致 LLM 解析 404
    for line in _text().splitlines():
        if line.startswith("MINIMAX_BASE_URL="):
            assert line.strip().endswith("/anthropic")
            break
    else:
        raise AssertionError("缺少 MINIMAX_BASE_URL")


def test_contains_keys_config_reads():
    t = _text()
    for key in ["MINIMAX_API_KEY=", "MINIMAX_LLM_MODEL=", "MINIMAX_IMAGE_MODEL=",
                "BAILIAN_API_KEY=", "BAILIAN_ASR_MODEL="]:
        assert key in t, f"{key} 缺失"
