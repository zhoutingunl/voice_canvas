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
    expect(ruleParse("画5个圆")).toBeNull();
  });

  it("位置词 → 走快路径并设置九宫格 pos", () => {
    expect(ruleParse("在右上角画一个蓝色的三角形")![0]).toMatchObject({ shape: "triangle", pos: "top-right" });
    expect(ruleParse("在左下角画个圆")![0].pos).toBe("bottom-left");
    expect(ruleParse("中间画个方块")![0].pos).toBe("center");
  });

  it("显式半径数值 → circle geo.r，且不被数量守卫误杀", () => {
    const cmds = ruleParse("在右上角画半径50的红色圆");
    expect(cmds).not.toBeNull(); // "50" 不应触发数量守卫
    expect(cmds![0]).toMatchObject({ shape: "circle", fill: "red", pos: "top-right" });
    expect(cmds![0].geo!.r).toBe(50);
  });

  it("矩形宽高数值", () => {
    expect(ruleParse("画一个宽200高100的矩形")![0].geo).toMatchObject({ w: 200, h: 100 });
  });

  it("三角形边长数值", () => {
    expect(ruleParse("画一个边长120的三角形")![0].geo!.size).toBe(120);
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
