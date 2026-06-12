# VoiceCanvas — AI 语音绘图工具

一款 **纯语音控制** 的绘图工具：用户不使用鼠标或键盘，仅通过语音指令完成绘图创作。校园招聘项目试题。

> 完整设计见 [`design.md`](./design.md)：支持的指令能力、系统架构、容错策略、延迟优化、复杂指令拆解，以及已实现 / 未完成项及原因。
> 演示脚本见 [`DEMO.md`](./DEMO.md)。

## 能力一览

- **第 1 档**：语音创建圆/矩形/椭圆/三角/直线/文字，调整颜色、尺寸、位置，删除、清空、撤销、重做
- **第 2 档**：一句话拆多步（"画三个圆排成一行"）、相对引用（"把刚才那个往右移"）、修改已有图形、**语义场景生成**（"画一只加菲猫靠在黑桌边，桌上一盆花" → 牡丹）
- **容错**：L1 同音词典归一化 + L2 LLM 容错解析 + L3 低置信度澄清回问
- **低延迟**：规则快路径（<50ms）+ 乐观渲染 + 占位骨架 + 异步回填

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React + Vite + TypeScript + react-konva |
| 后端 | Python Flask（薄代理，持有密钥） |
| ASR | Web Speech API（免费）/ 阿里百炼 paraformer（云端，规划中） |
| 指令解析 | MiniMax-M3（Anthropic 兼容） |
| 实体生图 | MiniMax image-01-live |

## 架构

```
浏览器/WebView ──/api──▶ Flask 薄代理（持有 Key）──▶ MiniMax-M3 / image-01-live / 百炼
   │  ASR(Web Speech)                                        前端不接触任何 Key
   └─ 归一化(L1) → 规则快路径 或 /api/parse(L2) → resolveScene → Konva 渲染
```

## 快速开始

### 1. 配置密钥

```bash
cp .env.example .env      # 填入 MiniMax / 阿里百炼 Key；.env 已 gitignore，绝不入库
```

### 2. 启动后端（Flask，默认 :5001）

```bash
cd backend
python3.11 -m pip install -r requirements.txt
python3.11 app.py
# 验证：curl localhost:5001/api/health ；联网校验 Key：python3.11 ../scripts/verify_keys.py
```

### 3. 启动前端（Vite，默认 :5173，/api 代理到后端）

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173 （**桌面用 Chrome/Edge**，需允许麦克风权限），点"🎤 开始聆听"，说出绘图指令。

## 测试

```bash
cd backend  && python3.11 -m pytest    # 27 用例
cd frontend && npm test                # 78 用例
```

共 **100 个单元测试**，外部 API 全部 mock，离线可跑。

## 开发约定

- 每次修改以 **PR** 形式提交，不直推 `main`。
- 提交信息中文说明，固定前缀：`[feat]` `[fix]` `[docs]` `[refactor]` `[test]` `[chore]`。
- 密钥仅存于 `.env`，**绝不入库**。

## 状态

核心功能已实现（PR #2–#7）。云端 ASR（百炼 paraformer 流式）、原生 App 套壳、QoS 独立看板为后续项，原因见 `design.md §18`。
