// ASR 工厂：按环境/偏好选择引擎。
// 默认 Web Speech（免费）；不支持时回退（百炼云端在后续 PR 接入）。

import type { IASREngine } from "./types";
import { WebSpeechASR } from "./WebSpeechASR";

export type ASRMode = "web-speech" | "bailian" | "auto";

export function createASR(mode: ASRMode = "auto"): IASREngine {
  if (mode === "bailian") {
    // 占位：百炼云端 ASR 在后续 PR 接入；当前回退到 Web Speech。
    return new WebSpeechASR();
  }
  // auto / web-speech
  return new WebSpeechASR();
}
