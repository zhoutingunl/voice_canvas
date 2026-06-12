# VoiceCanvas 前端（React + Vite + TS + react-konva）

纯语音绘图界面：常开聆听 → 归一化/规则快路径或 LLM 解析 → Konva 画布渲染。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173 （/api 代理到后端 5001）
npm run build    # 类型检查 + 生产构建
npm test         # vitest 单元测试
```

> 需要后端先启动（见 ../backend）。桌面用 Chrome/Edge（Web Speech API）。

## 结构

| 目录 | 职责 |
| --- | --- |
| `src/types/dsl.ts` | 指令 DSL 与画布对象类型 |
| `src/parser/` | L1 归一化（同音词典）+ 规则快路径 |
| `src/engine/` | 布局解析 + 画布状态机（撤销/重做） |
| `src/asr/` | ASR 抽象接口 + Web Speech 实现 + 工厂 |
| `src/api/` | 后端代理客户端（/api/parse、/api/imagine） |
| `src/canvas/` | react-konva 渲染（shape + entity 占位/图片） |
| `src/ui/` | 聆听指示器、指令日志 |

## 数据流

语音 → `normalize`（L1） → `ruleParse`（命中则零延迟本地执行） → 否则 `POST /api/parse`（MiniMax-M3） → `applyCommands` → Konva 渲染。entity 对象先显示占位骨架，`/api/imagine` 真图异步回填（乐观渲染）。

## 已覆盖单元测试

normalize / rules / layout / canvasReducer —— 共 35 个用例（`npm test`）。
