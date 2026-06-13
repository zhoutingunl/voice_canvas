"""MiniMax 文生图服务（image-01-live），用于语义实体 sprite 生成。

端点：POST {minimax_raw_base}/v1/image_generation
鉴权：Authorization: Bearer {api_key}
返回：data.image_urls / base_resp.status_code
"""
from __future__ import annotations

import base64

import requests


class MiniMaxImageError(RuntimeError):
    pass


class MiniMaxImage:
    def __init__(self, cfg) -> None:
        self.cfg = cfg

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.cfg.minimax_api_key}",
            "Content-Type": "application/json",
        }

    def generate(self, prompt: str, *, aspect_ratio: str = "1:1", n: int = 1) -> dict:
        """生成图片，返回 {"urls": [...]}。失败抛 MiniMaxImageError。"""
        if not self.cfg.minimax_ready:
            raise MiniMaxImageError("MINIMAX_API_KEY 未配置")
        if not prompt or not prompt.strip():
            raise MiniMaxImageError("prompt 不能为空")

        body = {
            "model": self.cfg.minimax_image_model,
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "response_format": "url",
            "n": n,
            "prompt_optimizer": True,
        }
        resp = requests.post(
            f"{self.cfg.minimax_raw_base}/v1/image_generation",
            headers=self._headers(), json=body, timeout=self.cfg.timeout,
        )
        if resp.status_code != 200:
            raise MiniMaxImageError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        base = data.get("base_resp", {}) or {}
        if base.get("status_code", 0) not in (0, None):
            raise MiniMaxImageError(f"生图失败：{base.get('status_msg')} (code={base.get('status_code')})")
        payload = data.get("data", {}) or {}
        urls = payload.get("image_urls") or []
        if not urls and payload.get("image_base64"):
            return {"image_base64": payload["image_base64"], "mime": "image/jpeg"}
        if not urls:
            raise MiniMaxImageError(f"返回中无图片：{str(data)[:200]}")
        # 服务端下载并转 base64：前端以 data URI 渲染，避免画布跨域污染、使其可导出
        b64, mime = self._fetch_as_base64(urls[0])
        out = {"urls": urls}
        if b64:
            out["image_base64"] = b64
            out["mime"] = mime
        return out

    def _fetch_as_base64(self, url: str) -> tuple[str | None, str]:
        try:
            r = requests.get(url, timeout=self.cfg.timeout)
            if r.status_code != 200:
                return None, ""
            mime = r.headers.get("Content-Type", "image/jpeg").split(";")[0]
            return base64.b64encode(r.content).decode("ascii"), mime
        except requests.RequestException:
            return None, ""
