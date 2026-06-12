// PCM Float32 → 16-bit WAV 编码（百炼 ASR 需要 WAV/PCM）。纯函数，可单测。

export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** 把单声道 Float32 采样编码为 WAV（PCM16）ArrayBuffer。 */
export function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const pcm = floatTo16BitPCM(samples);
  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i], true);

  return buffer;
}

/** 拼接多个 Float32 帧。 */
export function concatFrames(frames: Float32Array[]): Float32Array {
  const len = frames.reduce((a, f) => a + f.length, 0);
  const out = new Float32Array(len);
  let off = 0;
  for (const f of frames) { out.set(f, off); off += f.length; }
  return out;
}
