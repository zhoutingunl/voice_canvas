import { describe, expect, it } from "vitest";
import { normalize } from "../src/parser/normalize";

describe("normalize (L1 归一化)", () => {
  it("去掉语气词与填充词", () => {
    expect(normalize("嗯，那个，帮我画一个圆")).toBe("画一个圆");
  });

  it("同音错字纠正：园 → 圆", () => {
    expect(normalize("画一个园")).toContain("圆");
    expect(normalize("画一个园")).not.toContain("园");
  });

  it("同音错字纠正：桔形 → 矩形", () => {
    expect(normalize("画个桔形")).toContain("矩形");
  });

  it("去掉中文标点", () => {
    expect(normalize("画圆，然后清空。")).toBe("画圆 清空");
  });

  it("全角转半角", () => {
    expect(normalize("画３个圆")).toContain("3");
  });

  it("空输入返回空串", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
  });

  it("支持自定义词典", () => {
    expect(normalize("画一个香蕉", { dict: { 香蕉: "圆" } })).toContain("圆");
  });
});
