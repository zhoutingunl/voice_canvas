"""阿里百炼 paraformer 语音识别（同步文件识别）。

前端录制一段 16kHz 单声道 WAV 上传，这里用 DashScope SDK 同步识别返回文本。
相比 WebSocket 流式，REST 同步实现更简单稳妥，适合按句识别的交互。
"""
from __future__ import annotations

import os
import tempfile

import dashscope
from dashscope.audio.asr import Recognition


class BailianASRError(RuntimeError):
    pass


def _extract_text(result) -> str:
    """从 RecognitionResult 中抽取文本（兼容单句 dict 或多句 list）。"""
    s = result.get_sentence()
    if not s:
        return ""
    if isinstance(s, dict):
        s = [s]
    if isinstance(s, list):
        return "".join(x.get("text", "") for x in s if isinstance(x, dict)).strip()
    return ""


class BailianASR:
    def __init__(self, cfg) -> None:
        self.cfg = cfg

    def transcribe(self, wav_bytes: bytes, sample_rate: int = 16000) -> str:
        """识别一段 WAV（单声道）音频，返回文本。sample_rate 为实际采样率。"""
        if not self.cfg.bailian_ready:
            raise BailianASRError("BAILIAN_API_KEY 未配置或格式不正确（应以 sk- 开头）")
        if not wav_bytes:
            raise BailianASRError("音频为空")

        dashscope.api_key = self.cfg.bailian_api_key
        path = tempfile.mktemp(suffix=".wav")
        try:
            with open(path, "wb") as f:
                f.write(wav_bytes)
            rec = Recognition(
                model=self.cfg.bailian_asr_model,
                callback=None,
                format="wav",
                sample_rate=sample_rate,
            )
            result = rec.call(path)
            if result.status_code != 200:
                msg = getattr(result, "message", "") or ""
                raise BailianASRError(f"ASR HTTP {result.status_code}: {msg}")
            return _extract_text(result)
        finally:
            try:
                os.remove(path)
            except OSError:
                pass
