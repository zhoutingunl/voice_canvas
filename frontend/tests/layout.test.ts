import { describe, expect, it } from "vitest";
import { applyMove, resolvePos } from "../src/engine/layout";

describe("layout 位置解析", () => {
  it("枚举 center → 画布中心", () => {
    expect(resolvePos("center")).toEqual({ x: 400, y: 300 });
  });

  it("枚举 top-right", () => {
    const p = resolvePos("top-right");
    expect(p.x).toBeGreaterThan(400);
    expect(p.y).toBeLessThan(300);
  });

  it("坐标对象原样返回", () => {
    expect(resolvePos({ x: 123, y: 45 })).toEqual({ x: 123, y: 45 });
  });

  it("缺省回到中心", () => {
    expect(resolvePos(undefined)).toEqual({ x: 400, y: 300 });
  });

  it("applyMove 把坐标对象当作相对偏移", () => {
    expect(applyMove({ x: 100, y: 100 }, { x: 80, y: 0 })).toEqual({ x: 180, y: 100 });
  });

  it("applyMove 枚举位置视为绝对移动", () => {
    expect(applyMove({ x: 100, y: 100 }, "center")).toEqual({ x: 400, y: 300 });
  });
});
