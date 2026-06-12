"""Flask 路由集成测试：health / parse / imagine / asr / CORS（mock 服务层）。"""
from unittest.mock import patch


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.get_json()
    assert body["status"] == "ok"
    assert body["services"]["minimax"] is True
    assert body["models"]["llm"] == "MiniMax-M3"


def test_parse_success(client):
    fake = {"commands": [{"op": "create", "id": "c1", "kind": "shape", "shape": "circle"}], "raw": "[]"}
    with patch("app.MiniMaxLLM.parse_command", return_value=fake):
        r = client.post("/api/parse", json={"text": "画一个圆"})
    assert r.status_code == 200
    assert r.get_json()["commands"][0]["shape"] == "circle"


def test_parse_missing_text_400(client):
    r = client.post("/api/parse", json={})
    assert r.status_code == 400
    assert "text" in r.get_json()["error"]


def test_parse_service_error_502(client):
    from services.minimax_llm import MiniMaxLLMError
    with patch("app.MiniMaxLLM.parse_command", side_effect=MiniMaxLLMError("boom")):
        r = client.post("/api/parse", json={"text": "画一个圆"})
    assert r.status_code == 502


def test_imagine_success(client):
    with patch("app.MiniMaxImage.generate", return_value={"urls": ["https://x/cat.png"]}):
        r = client.post("/api/imagine", json={"prompt": "加菲猫"})
    assert r.status_code == 200
    assert r.get_json()["urls"] == ["https://x/cat.png"]


def test_imagine_missing_prompt_400(client):
    r = client.post("/api/imagine", json={})
    assert r.status_code == 400


def test_asr_success(client):
    with patch("app.BailianASR.transcribe", return_value="画一个圆"):
        r = client.post("/api/asr", data=b"RIFFfake", content_type="application/octet-stream")
    assert r.status_code == 200
    assert r.get_json()["text"] == "画一个圆"


def test_asr_empty_audio_400(client):
    r = client.post("/api/asr", data=b"", content_type="application/octet-stream")
    assert r.status_code == 400


def test_asr_service_error_502(client):
    from services.bailian_asr import BailianASRError
    with patch("app.BailianASR.transcribe", side_effect=BailianASRError("boom")):
        r = client.post("/api/asr", data=b"RIFFfake", content_type="application/octet-stream")
    assert r.status_code == 502


def test_cors_header_for_allowed_origin(client):
    r = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"


def test_cors_preflight_ok_with_header(client):
    # Flask 自动处理 OPTIONS（200），after_request 补 CORS 头即可。
    r = client.open("/api/parse", method="OPTIONS", headers={"Origin": "http://localhost:5173"})
    assert r.status_code in (200, 204)
    assert r.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
