# VoiceCanvas 后端（Flask 薄代理）

持有第三方 Key（前端不接触），转发 AI 请求。

## 端点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 + 各服务就绪状态 |
| POST | `/api/parse` | `{text, context?}` → 指令 DSL（MiniMax-M3） |
| POST | `/api/imagine` | `{prompt, aspect_ratio?}` → 图片 url（image-01-live） |
| POST | `/api/asr` | 阿里百炼 paraformer（后续 PR 接入，当前占位 501） |

## 运行

```bash
# 凭据：项目根 .env（已 gitignore），见 ../.env.example
python3.11 -m pip install -r requirements.txt   # flask / requests / pytest
python3.11 app.py                                # 默认 0.0.0.0:5001
```

## 测试

```bash
python3.11 -m pytest          # 单元测试（mock 外部 API，离线可跑）
python3.11 ../scripts/verify_keys.py   # 联网验证 .env 里的真实 Key 是否可用
```

## 设计说明

- CORS 手写于 `app.py`，未引入 flask-cors。
- ASR：桌面端默认走前端 Web Speech API（免费、无需后端）；云端 paraformer 用于手机/付费路径，走 WebSocket 流式，后续 PR 接入。
- MiniMax LLM 走 Anthropic 兼容 `/anthropic/v1/messages`（`x-api-key` 头）；生图走原始域名 `/v1/image_generation`（`Bearer` 头）。
