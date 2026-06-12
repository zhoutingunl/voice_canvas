// Web Speech API 实现（免费、桌面浏览器）。常开聆听 + 流式中间结果。
// 注意：WebView 内不可用，手机端走百炼（后续 PR）。

import type { ASRCallbacks, IASREngine } from "./types";

// 浏览器前缀兼容
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

function getCtor(): SpeechRecognitionCtor | null {
  const w = globalThis as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class WebSpeechASR implements IASREngine {
  readonly name = "web-speech";
  private rec: SpeechRecognitionLike | null = null;
  private listening = false;
  private manualStop = false;

  isSupported(): boolean {
    return getCtor() !== null;
  }

  start(cb: ASRCallbacks): void {
    const Ctor = getCtor();
    if (!Ctor) {
      cb.onError?.("当前浏览器不支持 Web Speech API");
      return;
    }
    this.manualStop = false;
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) cb.onFinal(text.trim());
        else cb.onPartial?.(text.trim());
      }
    };
    rec.onerror = (e) => cb.onError?.(e.error);
    rec.onend = () => {
      this.listening = false;
      cb.onStateChange?.(false);
      // 常开：非手动停止则自动重启（浏览器会周期性结束会话）
      if (!this.manualStop) {
        try { rec.start(); this.listening = true; cb.onStateChange?.(true); } catch { /* ignore */ }
      }
    };

    this.rec = rec;
    try {
      rec.start();
      this.listening = true;
      cb.onStateChange?.(true);
    } catch (err) {
      cb.onError?.(String(err));
    }
  }

  stop(): void {
    this.manualStop = true;
    this.rec?.stop();
    this.listening = false;
  }

  get isListening(): boolean {
    return this.listening;
  }
}
