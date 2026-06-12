# VoiceCanvas — AI 语音绘图工具

一款 **纯语音控制** 的绘图工具：用户不使用鼠标或键盘，仅通过语音指令完成绘图创作。校园招聘项目试题。

## 设计文档

完整设计见 [`design.md`](./design.md)，涵盖：支持的指令能力、系统架构、容错策略、延迟优化、复杂指令拆解，以及已实现 / 未完成项及原因。

## 技术栈（规划）

| 层 | 选型 |
| --- | --- |
| 前端 | React + Vite + TypeScript + react-konva |
| 后端 | Python Flask（薄代理，持有密钥） |
| ASR | Web Speech API（免费）/ 阿里百炼（云端、手机、付费） |
| 指令解析 | MiniMax-M3 |
| 实体生图 | MiniMax image-01-live |

## 密钥配置

```bash
cp .env.example .env   # 填入真实 Key；.env 已被忽略，绝不入库
```

## 开发约定

- 每次修改以 **PR** 形式提交，不直推默认分支。
- 提交信息中文说明，固定前缀：`[feat]` `[fix]` `[docs]` `[refactor]` `[test]` `[chore]`。

## 状态

设计定稿，编码尚未开始。
