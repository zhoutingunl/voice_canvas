import { describe, expect, it } from "vitest";
import {
  batchConfidence,
  classifyReply,
  needsClarification,
  summarize,
} from "../src/engine/clarify";
import type { Command } from "../src/types/dsl";

describe("batchConfidence", () => {
  it("取最小置信度", () => {
    expect(batchConfidence([{ op: "create", confidence: 0.9 }, { op: "create", confidence: 0.6 }])).toBe(0.6);
  });
  it("缺省视为 1", () => {
    expect(batchConfidence([{ op: "clear" }])).toBe(1);
  });
  it("空数组为 1", () => {
    expect(batchConfidence([])).toBe(1);
  });
});

describe("needsClarification", () => {
  it("低置信度 → 需要澄清", () => {
    expect(needsClarification([{ op: "create", confidence: 0.6 }])).toBe(true);
  });
  it("高置信度 → 不需要", () => {
    expect(needsClarification([{ op: "create", confidence: 0.95 }])).toBe(false);
  });
  it("显式 needs_clarification → 需要", () => {
    expect(needsClarification([{ op: "create", confidence: 0.99, needs_clarification: true }])).toBe(true);
  });
  it("空指令 → 不需要", () => {
    expect(needsClarification([])).toBe(false);
  });
});

describe("classifyReply", () => {
  it.each(["是", "对", "确认", "好的", "没错"])("肯定：%s", (t) => {
    expect(classifyReply(t)).toBe("yes");
  });
  it.each(["不是", "取消", "不对", "算了"])("否定：%s", (t) => {
    expect(classifyReply(t)).toBe("no");
  });
  it("其它：画一个圆", () => {
    expect(classifyReply("画一个圆")).toBe("other");
  });
});

describe("summarize", () => {
  it("优先用模型给的 clarify", () => {
    expect(summarize([{ op: "create", clarify: "你是要画圆吗" }])).toBe("你是要画圆吗");
  });
  it("概括创建图形（含颜色）", () => {
    const cmds: Command[] = [{ op: "create", kind: "shape", shape: "circle", fill: "red" }];
    expect(summarize(cmds)).toContain("圆");
    expect(summarize(cmds)).toContain("red");
  });
  it("相同项计数合并", () => {
    const c: Command = { op: "create", kind: "shape", shape: "circle" };
    expect(summarize([c, c, c])).toContain("×3");
  });
});
