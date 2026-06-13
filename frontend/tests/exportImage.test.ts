import { describe, expect, it } from "vitest";
import { isExportCommand } from "../src/engine/exportImage";
import { imagineImageSrc } from "../src/api/backend";

describe("isExportCommand", () => {
  it.each(["导出", "保存", "下载", "截图", "保存图片", "把它存下来"])("识别：%s", (t) => {
    expect(isExportCommand(t)).toBe(true);
  });
  it("普通绘图指令不误判", () => {
    expect(isExportCommand("画一个圆")).toBe(false);
    expect(isExportCommand("撤销")).toBe(false);
  });
});

describe("imagineImageSrc", () => {
  it("优先用 base64 data URI（同源、可导出）", () => {
    const src = imagineImageSrc({ image_base64: "AAAA", mime: "image/png", urls: ["http://x/a.jpg"] });
    expect(src).toBe("data:image/png;base64,AAAA");
  });
  it("base64 缺省 mime → image/jpeg", () => {
    expect(imagineImageSrc({ image_base64: "BBBB" })).toBe("data:image/jpeg;base64,BBBB");
  });
  it("无 base64 时回退到 url", () => {
    expect(imagineImageSrc({ urls: ["http://x/a.jpg"] })).toBe("http://x/a.jpg");
  });
  it("都没有 → null", () => {
    expect(imagineImageSrc({})).toBeNull();
  });
});
