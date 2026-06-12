// ASR 抽象接口：屏蔽 Web Speech / 百炼 等底层差异（design.md §6）。

export interface ASRCallbacks {
  onPartial?: (text: string) => void; // 流式中间结果
  onFinal: (text: string) => void; // 一句话最终结果
  onError?: (err: string) => void;
  onStateChange?: (listening: boolean) => void;
}

export interface IASREngine {
  readonly name: string;
  /** 是否在当前环境可用 */
  isSupported(): boolean;
  start(cb: ASRCallbacks): void;
  stop(): void;
}
