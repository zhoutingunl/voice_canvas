import { describe, expect, it } from "vitest";
import { DEFAULT_VAD, VADSegmenter, rms } from "../src/asr/vad";

const SR = 16000;
const FRAME = 1600; // 100ms @16k
const loud = () => new Float32Array(FRAME).fill(0.3); // rms 0.3 > 阈值
const quiet = () => new Float32Array(FRAME); // 全 0

function feedAll(seg: VADSegmenter, frames: Float32Array[]): Float32Array[] {
  const out: Float32Array[] = [];
  for (const f of frames) {
    const r = seg.feed(f);
    if (r) out.push(r);
  }
  return out;
}

describe("rms", () => {
  it("全 0 → 0", () => expect(rms(quiet())).toBe(0));
  it("有声 > 0", () => expect(rms(loud())).toBeGreaterThan(0.1));
});

describe("VADSegmenter", () => {
  it("说话后静音 700ms → 输出一段", () => {
    const seg = new VADSegmenter({ sampleRate: SR, ...DEFAULT_VAD });
    // 4 帧说话(400ms) + 7 帧静音(700ms)
    const frames = [...Array(4)].map(loud).concat([...Array(7)].map(quiet));
    const segs = feedAll(seg, frames);
    expect(segs).toHaveLength(1);
    expect(segs[0].length).toBeGreaterThan(4 * FRAME); // 含说话帧
  });

  it("静音不足时不断句", () => {
    const seg = new VADSegmenter({ sampleRate: SR, ...DEFAULT_VAD });
    const frames = [...Array(4)].map(loud).concat([...Array(3)].map(quiet)); // 仅 300ms 静音
    expect(feedAll(seg, frames)).toHaveLength(0);
  });

  it("过短语音（<300ms）被丢弃", () => {
    const seg = new VADSegmenter({ sampleRate: SR, ...DEFAULT_VAD });
    // 1 帧说话(100ms) + 7 帧静音 → 触发断句但语音过短 → 丢弃
    const frames = [loud()].concat([...Array(7)].map(quiet));
    expect(feedAll(seg, frames)).toHaveLength(0);
  });

  it("纯静音不产生任何段", () => {
    const seg = new VADSegmenter({ sampleRate: SR, ...DEFAULT_VAD });
    expect(feedAll(seg, [...Array(20)].map(quiet))).toHaveLength(0);
  });

  it("超过 maxMs 强制断句", () => {
    const seg = new VADSegmenter({ sampleRate: SR, threshold: 0.012, silenceMs: 700, minSpeechMs: 100, maxMs: 500 });
    // 持续说话 6 帧(600ms) > maxMs 500ms → 强制断句
    const segs = feedAll(seg, [...Array(6)].map(loud));
    expect(segs.length).toBeGreaterThanOrEqual(1);
  });

  it("两句话分别断句", () => {
    const seg = new VADSegmenter({ sampleRate: SR, ...DEFAULT_VAD });
    const one = [...Array(4)].map(loud).concat([...Array(7)].map(quiet));
    const two = [...Array(4)].map(loud).concat([...Array(7)].map(quiet));
    expect(feedAll(seg, one.concat(two))).toHaveLength(2);
  });
});
