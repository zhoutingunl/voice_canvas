// ASR 工厂：按模式选择引擎。
// web-speech：免费、依赖 Google（国内可能不稳）；bailian：阿里云，国内稳定。

import type { IASREngine } from "./types";
import { WebSpeechASR } from "./WebSpeechASR";
import { BailianASR } from "./BailianASR";

export type ASRMode = "web-speech" | "bailian";

export function createASR(mode: ASRMode = "web-speech"): IASREngine {
  return mode === "bailian" ? new BailianASR() : new WebSpeechASR();
}
