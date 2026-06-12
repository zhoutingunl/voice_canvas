// 能量 VAD：常开聆听时按"说话→静音"自动断句，得到一段完整语音再上传。
// 纯逻辑，可单测（喂合成帧验证断句）。

import { concatFrames } from "./wav";

export function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / Math.max(1, frame.length));
}

export interface VADConfig {
  sampleRate: number;
  threshold: number; // 能量阈值，高于视为有声
  silenceMs: number; // 说话后静音多久判定一句结束
  minSpeechMs: number; // 一句最短时长，过短丢弃（防误触）
  maxMs: number; // 一句最长时长，超过强制断句
}

export const DEFAULT_VAD: Omit<VADConfig, "sampleRate"> = {
  threshold: 0.012,
  silenceMs: 700,
  minSpeechMs: 300,
  maxMs: 12000,
};

/** VAD 断句器：逐帧 feed，返回一段完整语音（Float32）或 null。 */
export class VADSegmenter {
  private buf: Float32Array[] = [];
  private speaking = false;
  private silenceSamples = 0;
  private speechSamples = 0;

  constructor(private cfg: VADConfig) {}

  private ms(samples: number): number {
    return (samples / this.cfg.sampleRate) * 1000;
  }

  private bufSamples(): number {
    return this.buf.reduce((a, f) => a + f.length, 0);
  }

  reset(): void {
    this.buf = [];
    this.speaking = false;
    this.silenceSamples = 0;
    this.speechSamples = 0;
  }

  /** 喂一帧；一句结束时返回该句采样，否则 null。 */
  feed(frame: Float32Array): Float32Array | null {
    const active = rms(frame) >= this.cfg.threshold;

    if (active) {
      this.speaking = true;
      this.silenceSamples = 0;
      this.speechSamples += frame.length;
      this.buf.push(frame);
    } else if (this.speaking) {
      this.silenceSamples += frame.length;
      this.buf.push(frame);
    }

    if (!this.speaking) return null;

    const endBySilence = this.ms(this.silenceSamples) >= this.cfg.silenceMs;
    const endByMax = this.ms(this.bufSamples()) >= this.cfg.maxMs;
    if (endBySilence || endByMax) {
      const enough = this.ms(this.speechSamples) >= this.cfg.minSpeechMs;
      const seg = enough ? concatFrames(this.buf) : null;
      this.reset();
      return seg;
    }
    return null;
  }
}
