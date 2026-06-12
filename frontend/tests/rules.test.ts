import { beforeEach, describe, expect, it } from "vitest";
import { ruleParse, _resetSeq } from "../src/parser/rules";

beforeEach(() => _resetSeq());

describe("ruleParse (规则快路径)", () => {
  it("清空 → clear", () => {
    expect(ruleParse("清空")?.[0].op).toBe("clear");
  });

  it("撤销 → undo", () => {
    expect(ruleParse("撤销")?.[0].op).toBe("undo");
  });

  it("重做 → redo", () => {
    expect(ruleParse("重做")?.[0].op).toBe("redo");
  });

  it("画一个红色的圆 → 单条 create circle", () => {
    const cmds = ruleParse("画一个红色的圆")!;
    expect(cmds).toHaveLength(1);
    expect(cmds[0]).toMatchObject({ op: "create", kind: "shape", shape: "circle", fill: "red" });
  });

  it("大圆 → 半径放大", () => {
    const cmds = ruleParse("画一个大圆")!;
    expect(cmds[0].geo!.r).toBe(64); // 40 * 1.6
  });

  it("小方块 → 尺寸缩小", () => {
    const cmds = ruleParse("画一个小方块")!;
    expect(cmds[0].shape).toBe("rect");
    expect(cmds[0].geo!.w).toBe(60); // 100 * 0.6
  });

  it("含数量/布局词 → 返回 null（交给 LLM 拆解）", () => {
    expect(ruleParse("画三个圆排成一行")).toBeNull();
    expect(ruleParse("画一个2乘2的方格")).toBeNull();
  });

  it("语义实体（加菲猫）→ 返回 null（交给 LLM）", () => {
    expect(ruleParse("画一只加菲猫")).toBeNull();
  });

  it("空文本 → null", () => {
    expect(ruleParse("")).toBeNull();
  });

  it("id 递增唯一", () => {
    const a = ruleParse("画一个圆")![0].id;
    const b = ruleParse("画一个圆")![0].id;
    expect(a).not.toBe(b);
  });
});
