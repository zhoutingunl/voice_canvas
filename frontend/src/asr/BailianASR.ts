// 百炼云端 ASR（IASREngine 实现）：采集麦克风 PCM → VAD 断句 → WAV → 上传 /api/asr。
// 不依赖 Google，国内网络稳定；适合手机/WebView 与 Web Speech 不可用的环境。

import type { ASRCallbacks, IASREngine } from "./types";
import { DEFAULT_VAD, VADSegmenter } from "./vad";
import { encodeWAV } from "./wav";
import { transcribeAudio } from "../api/backend";

const TARGET_RATE = 16000;
const FRAME = 4096;

export class BailianASR implements IASREngine {
  readonly name = "bailian";
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: ScriptProcessorNode | null = null;
  private seg: VADSegmenter | null = null;
  private stopped = false;
  private cb: ASRCallbacks | null = null;

  isSupported(): boolean {
    const w = globalThis as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      (!!w.AudioContext || !!w.webkitAudioContext)
    );
  }

  async start(cb: ASRCallbacks): Promise<void> {
    this.stopped = false;
    this.cb = cb;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      cb.onError?.("麦克风权限被拒绝或不可用");
      return;
    }

    const w = globalThis as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext ?? w.webkitAudioContext!;
    this.ctx = new AC({ sampleRate: TARGET_RATE });
    const sr = this.ctx.sampleRate; // 实际采样率（Chrome 通常 = 16000）
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(FRAME, 1, 1);
    this.seg = new VADSegmenter({ sampleRate: sr, ...DEFAULT_VAD });

    this.node.onaudioprocess = (ev: AudioProcessingEvent) => {
      if (this.stopped || !this.seg) return;
      // 拷贝当前帧（底层 buffer 会复用）
      const frame = new Float32Array(ev.inputBuffer.getChannelData(0));
      const segment = this.seg.feed(frame);
      if (segment) {
        cb.onPartial?.("识别中…");
        const wav = encodeWAV(segment, sr);
        transcribeAudio(new Blob([wav], { type: "audio/wav" }), sr)
          .then((text) => {
            cb.onPartial?.("");
            if (text) cb.onFinal(text);
          })
          .catch((e) => {
            cb.onPartial?.("");
            cb.onError?.(String(e));
          });
      }
    };

    this.source.connect(this.node);
    this.node.connect(this.ctx.destination);
    cb.onStateChange?.(true);
  }

  stop(): void {
    this.stopped = true;
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.node = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
    this.seg = null;
    this.cb?.onStateChange?.(false);
  }
}
