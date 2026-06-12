import { describe, expect, it } from "vitest";
import { concatFrames, encodeWAV, floatTo16BitPCM } from "../src/asr/wav";

const str = (view: DataView, off: number, len: number) =>
  Array.from({ length: len }, (_, i) => String.fromCharCode(view.getUint8(off + i))).join("");

describe("floatTo16BitPCM", () => {
  it("范围映射正确", () => {
    const out = floatTo16BitPCM(new Float32Array([0, 1, -1]));
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0x7fff);
    expect(out[2]).toBe(-0x8000);
  });
  it("超界裁剪", () => {
    const out = floatTo16BitPCM(new Float32Array([2, -2]));
    expect(out[0]).toBe(0x7fff);
    expect(out[1]).toBe(-0x8000);
  });
});

describe("encodeWAV", () => {
  it("WAV 头正确（RIFF/WAVE/data + 单声道16bit）", () => {
    const buf = encodeWAV(new Float32Array([0, 0.5, -0.5, 0]), 16000);
    const v = new DataView(buf);
    expect(str(v, 0, 4)).toBe("RIFF");
    expect(str(v, 8, 4)).toBe("WAVE");
    expect(str(v, 36, 4)).toBe("data");
    expect(v.getUint16(22, true)).toBe(1); // 单声道
    expect(v.getUint32(24, true)).toBe(16000); // 采样率
    expect(v.getUint16(34, true)).toBe(16); // 位深
  });
  it("长度 = 44 + 采样数*2", () => {
    const buf = encodeWAV(new Float32Array(100), 16000);
    expect(buf.byteLength).toBe(44 + 100 * 2);
  });
});

describe("concatFrames", () => {
  it("拼接多帧", () => {
    const out = concatFrames([new Float32Array([1, 2]), new Float32Array([3])]);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });
});
