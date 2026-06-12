// 后端代理客户端：前端只调用自己的 /api（key 在后端，不接触第三方）。

import type { Command } from "../types/dsl";

export interface ParseResult {
  commands: Command[];
  raw?: string;
}

export interface ParseContext {
  objects?: { id: string; kind: string; shape?: string }[];
  last_id?: string;
}

/** 文本 → 指令 DSL（后端 MiniMax-M3）。 */
export async function parseCommand(text: string, context?: ParseContext): Promise<ParseResult> {
  const resp = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, context }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `parse HTTP ${resp.status}`);
  }
  return resp.json();
}

/** 上传一段 WAV 音频 → 文本（后端百炼 paraformer）。 */
export async function transcribeAudio(wav: Blob, sampleRate = 16000): Promise<string> {
  const resp = await fetch("/api/asr", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "X-Sample-Rate": String(sampleRate) },
    body: wav,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `asr HTTP ${resp.status}`);
  }
  const data = await resp.json();
  return (data.text || "").trim();
}

/** 文本 → 图片 url（后端 image-01-live）。 */
export async function imagine(prompt: string, aspectRatio = "1:1"): Promise<{ urls?: string[]; base64?: string }> {
  const resp = await fetch("/api/imagine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `imagine HTTP ${resp.status}`);
  }
  return resp.json();
}
