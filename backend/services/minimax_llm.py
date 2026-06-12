"""MiniMax-M3 指令解析服务（Anthropic 兼容 /v1/messages）。

参考 see_talk/ai/minimax.py 的鉴权与调用约定：
- 鉴权头：x-api-key + anthropic-version
- 返回：content[].text 拼接
"""
from __future__ import annotations

import json
import re

import requests

from .prompts import PARSE_SYSTEM_PROMPT, build_user_prompt


class MiniMaxLLMError(RuntimeError):
    pass


def _extract_json_array(text: str) -> list:
    """从模型输出中稳健地抽取 JSON 数组（容忍 markdown 代码块、前后噪声）。"""
    s = text.strip()
    # 去掉 ```json ... ``` 围栏
    fence = re.search(r"```(?:json)?\s*(.*?)```", s, re.DOTALL)
    if fence:
        s = fence.group(1).strip()
    # 直接尝试
    try:
        parsed = json.loads(s)
    except json.JSONDecodeError:
        # 退而求其次：截取第一个 [ 到最后一个 ]
        start, end = s.find("["), s.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise MiniMaxLLMError(f"模型未返回有效 JSON：{text[:200]}")
        parsed = json.loads(s[start : end + 1])
    if isinstance(parsed, dict):
        parsed = [parsed]
    if not isinstance(parsed, list):
        raise MiniMaxLLMError(f"解析结果不是数组：{text[:200]}")
    return parsed


class MiniMaxLLM:
    def __init__(self, cfg) -> None:
        self.cfg = cfg

    def _headers(self) -> dict:
        return {
            "x-api-key": self.cfg.minimax_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    def parse_command(self, text: str, context: dict | None = None, max_tokens: int = 1024) -> dict:
        """文本 → 指令数组。返回 {"commands": [...], "raw": "..."}。"""
        if not self.cfg.minimax_ready:
            raise MiniMaxLLMError("MINIMAX_API_KEY 未配置")
        if not text or not text.strip():
            raise MiniMaxLLMError("text 不能为空")

        body = {
            "model": self.cfg.minimax_llm_model,
            "max_tokens": max_tokens,
            "system": PARSE_SYSTEM_PROMPT,
            "messages": [
                {"role": "user", "content": [
                    {"type": "text", "text": build_user_prompt(text, context)},
                ]},
            ],
        }
        resp = requests.post(
            f"{self.cfg.minimax_base_url}/v1/messages",
            headers=self._headers(), json=body, timeout=self.cfg.timeout,
        )
        if resp.status_code != 200:
            raise MiniMaxLLMError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        raw = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        commands = _extract_json_array(raw)
        return {"commands": commands, "raw": raw}
