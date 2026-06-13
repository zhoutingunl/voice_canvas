import { describe, expect, it } from "vitest";
import { asrModeFromSearch, createASR } from "../src/asr/createASR";

describe("asrModeFromSearch", () => {
  it("?asr=bailian → bailian（手机/WebView 默认云端）", () => {
    expect(asrModeFromSearch("?asr=bailian")).toBe("bailian");
  });
  it("空 query → web-speech（桌面默认免费）", () => {
    expect(asrModeFromSearch("")).toBe("web-speech");
  });
  it("?asr=web-speech → web-speech", () => {
    expect(asrModeFromSearch("?asr=web-speech")).toBe("web-speech");
  });
  it("无关参数 → web-speech", () => {
    expect(asrModeFromSearch("?foo=1")).toBe("web-speech");
  });
});

describe("createASR", () => {
  it("bailian 模式返回 bailian 引擎", () => {
    expect(createASR("bailian").name).toBe("bailian");
  });
  it("默认返回 web-speech 引擎", () => {
    expect(createASR().name).toBe("web-speech");
  });
});
