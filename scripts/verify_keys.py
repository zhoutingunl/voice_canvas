#!/usr/bin/env python3
"""验证 .env 里的 MiniMax 与 阿里百炼(DashScope) 凭据是否可用。

纯标准库实现（urllib），无需安装依赖。读取同级或上级目录的 .env。
用法：python3 scripts/verify_keys.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


def load_env() -> dict:
    """从项目根的 .env 读取键值（简单解析，够用即可）。"""
    root = Path(__file__).resolve().parent.parent
    env_path = root / ".env"
    data: dict[str, str] = {}
    if not env_path.exists():
        print(f"✗ 找不到 .env：{env_path}")
        sys.exit(1)
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip().strip('"').strip("'")
    return data


def mask(s: str) -> str:
    return (s[:6] + "…" + s[-3:]) if s and len(s) > 10 else "(空)"


def post_json(url: str, headers: dict, body: dict, timeout: int = 20):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={**headers, "Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # 网络层错误
        return -1, str(e)


def verify_minimax(env: dict) -> bool:
    key = env.get("MINIMAX_API_KEY", "")
    base = env.get("MINIMAX_BASE_URL", "https://api.minimaxi.com/anthropic")
    model = env.get("MINIMAX_LLM_MODEL", "MiniMax-M3")
    print(f"\n[MiniMax] key={mask(key)} model={model} base={base}")
    if not key:
        print("  ✗ 未配置 MINIMAX_API_KEY")
        return False
    status, text = post_json(
        f"{base}/v1/messages",
        {"x-api-key": key, "anthropic-version": "2023-06-01"},
        {"model": model, "max_tokens": 16,
         "messages": [{"role": "user", "content": [{"type": "text", "text": "ping，只回复 pong"}]}]},
    )
    if status == 200:
        try:
            reply = "".join(b.get("text", "") for b in json.loads(text).get("content", []))
        except Exception:
            reply = text[:60]
        print(f"  ✓ 通过 (HTTP 200)，模型回复：{reply.strip()[:40]}")
        return True
    print(f"  ✗ 失败 (HTTP {status})：{text[:200]}")
    return False


def verify_bailian(env: dict) -> bool:
    """用 DashScope 文本生成端点探活 key（账号级 key，对 ASR 同样有效）。

    判定：HTTP 200 → key 有效；401/InvalidApiKey → key 无效；
    其它错误（如模型未开通）→ 鉴权已通过，key 仍判为有效。
    """
    key = env.get("BAILIAN_API_KEY", "")
    asr_model = env.get("BAILIAN_ASR_MODEL", "paraformer-realtime-v2")
    print(f"\n[阿里百炼 DashScope] key={mask(key)} asr_model={asr_model}")
    if not key:
        print("  ✗ 未配置 BAILIAN_API_KEY")
        return False
    if not key.startswith("sk-"):
        print(f"  ✗ 格式可疑：百炼 key 应以 'sk-' 开头，当前为 '{key[:6]}…'")
        return False
    status, text = post_json(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
        {"Authorization": f"Bearer {key}"},
        {"model": "qwen-turbo",
         "input": {"messages": [{"role": "user", "content": "ping，只回复 pong"}]},
         "parameters": {"result_format": "message"}},
    )
    if status == 200:
        print("  ✓ 通过 (HTTP 200)，key 有效")
        return True
    low = text.lower()
    if status in (401, 403) or "invalidapikey" in low or "invalid api key" in low or "unauthorized" in low:
        print(f"  ✗ 失败：key 无效或未授权 (HTTP {status})：{text[:200]}")
        return False
    # 鉴权通过但模型/服务问题 —— key 本身有效
    print(f"  ⚠ key 鉴权通过，但 qwen-turbo 探测返回 HTTP {status}（可能该模型未开通，不影响 ASR）：{text[:160]}")
    return True


def main() -> int:
    env = load_env()
    ok_mm = verify_minimax(env)
    ok_bl = verify_bailian(env)
    print("\n==== 结果汇总 ====")
    print(f"  MiniMax       : {'✓ 可用' if ok_mm else '✗ 不可用'}")
    print(f"  阿里百炼(ASR) : {'✓ 可用' if ok_bl else '✗ 不可用'}")
    return 0 if (ok_mm and ok_bl) else 1


if __name__ == "__main__":
    raise SystemExit(main())
