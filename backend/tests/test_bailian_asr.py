"""BailianASR 单元测试：文本抽取 + transcribe（mock dashscope）。"""
from unittest.mock import MagicMock, patch

import pytest

from services.bailian_asr import BailianASR, BailianASRError, _extract_text


def test_extract_text_single_dict():
    r = MagicMock()
    r.get_sentence.return_value = {"text": "画一个圆"}
    assert _extract_text(r) == "画一个圆"


def test_extract_text_list():
    r = MagicMock()
    r.get_sentence.return_value = [{"text": "画一个"}, {"text": "红色的圆"}]
    assert _extract_text(r) == "画一个红色的圆"


def test_extract_text_empty():
    r = MagicMock()
    r.get_sentence.return_value = None
    assert _extract_text(r) == ""


def test_transcribe_success(cfg):
    fake = MagicMock()
    fake.status_code = 200
    fake.get_sentence.return_value = {"text": "清空画布"}
    with patch("services.bailian_asr.Recognition") as Rec:
        Rec.return_value.call.return_value = fake
        out = BailianASR(cfg).transcribe(b"RIFFfake-wav-bytes")
    assert out == "清空画布"
    # 校验用了正确的模型与格式
    _, kwargs = Rec.call_args
    assert kwargs["model"] == "paraformer-realtime-v2"
    assert kwargs["format"] == "wav"
    assert kwargs["sample_rate"] == 16000


def test_transcribe_empty_audio_raises(cfg):
    with pytest.raises(BailianASRError):
        BailianASR(cfg).transcribe(b"")


def test_transcribe_bad_status_raises(cfg):
    fake = MagicMock()
    fake.status_code = 401
    fake.message = "invalid key"
    with patch("services.bailian_asr.Recognition") as Rec:
        Rec.return_value.call.return_value = fake
        with pytest.raises(BailianASRError):
            BailianASR(cfg).transcribe(b"RIFFxx")


def test_transcribe_requires_key():
    from config import Config
    eng = BailianASR(Config(bailian_api_key=""))
    with pytest.raises(BailianASRError):
        eng.transcribe(b"RIFFxx")
