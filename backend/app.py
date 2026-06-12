"""VoiceCanvas 后端薄代理。

职责：持有第三方 Key（前端不接触），转发三类请求：
- POST /api/parse   文本 → 指令 DSL（MiniMax-M3）
- POST /api/imagine 文本 → 图片 url（MiniMax image-01-live）
- POST /api/asr     语音 → 文本（阿里百炼 paraformer，PR 后续接入，当前占位）
- GET  /api/health  健康检查与各服务就绪状态

CORS 手写（薄代理无需额外依赖）。
"""
from __future__ import annotations

from flask import Flask, jsonify, request

from config import get_config
from services.bailian_asr import BailianASR, BailianASRError
from services.minimax_image import MiniMaxImage, MiniMaxImageError
from services.minimax_llm import MiniMaxLLM, MiniMaxLLMError


def create_app(cfg=None) -> Flask:
    cfg = cfg or get_config()
    app = Flask(__name__)
    app.config["VC_CFG"] = cfg
    llm = MiniMaxLLM(cfg)
    image = MiniMaxImage(cfg)
    asr_engine = BailianASR(cfg)

    allowed = {o.strip() for o in cfg.allowed_origins.split(",") if o.strip()}

    @app.after_request
    def add_cors(resp):
        origin = request.headers.get("Origin", "")
        if origin in allowed or "*" in allowed:
            resp.headers["Access-Control-Allow-Origin"] = origin or "*"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return resp

    # OPTIONS 预检：Flask 对各路由自动处理（返回 200），after_request 会补 CORS 头。

    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "services": {
                "minimax": cfg.minimax_ready,
                "bailian_asr": cfg.bailian_ready,
            },
            "models": {
                "llm": cfg.minimax_llm_model,
                "image": cfg.minimax_image_model,
                "asr": cfg.bailian_asr_model,
            },
        })

    @app.post("/api/parse")
    def parse():
        data = request.get_json(silent=True) or {}
        text = (data.get("text") or "").strip()
        if not text:
            return jsonify({"error": "缺少 text"}), 400
        try:
            result = llm.parse_command(text, context=data.get("context"))
            return jsonify(result)
        except MiniMaxLLMError as e:
            return jsonify({"error": str(e)}), 502

    @app.post("/api/imagine")
    def imagine():
        data = request.get_json(silent=True) or {}
        prompt = (data.get("prompt") or "").strip()
        if not prompt:
            return jsonify({"error": "缺少 prompt"}), 400
        try:
            result = image.generate(prompt, aspect_ratio=data.get("aspect_ratio", "1:1"))
            return jsonify(result)
        except MiniMaxImageError as e:
            return jsonify({"error": str(e)}), 502

    @app.post("/api/asr")
    def asr():
        # 接收前端上传的 WAV（16kHz 单声道）二进制，调百炼 paraformer 识别。
        audio = request.get_data()
        if not audio:
            return jsonify({"error": "缺少音频数据"}), 400
        try:
            sample_rate = int(request.headers.get("X-Sample-Rate", "16000"))
        except ValueError:
            sample_rate = 16000
        try:
            text = asr_engine.transcribe(audio, sample_rate=sample_rate)
            return jsonify({"text": text})
        except BailianASRError as e:
            return jsonify({"error": str(e)}), 502

    return app


if __name__ == "__main__":
    config = get_config()
    create_app(config).run(host=config.host, port=config.port, debug=True)
