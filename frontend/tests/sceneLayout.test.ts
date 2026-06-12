import { describe, expect, it } from "vitest";
import { resolveScene } from "../src/engine/sceneLayout";
import type { Command } from "../src/types/dsl";

const garfieldScene: Command[] = [
  { op: "create", id: "table", kind: "entity", entity: "桌子", pos: "bottom", z: 1 },
  { op: "create", id: "cat", kind: "entity", entity: "加菲猫", rel: "靠在 table 左边", z: 2 },
  { op: "create", id: "pot", kind: "entity", entity: "花盆", rel: "在 table 上", z: 2 },
  { op: "create", id: "flower", kind: "entity", entity: "花", rel: "在 pot 里", z: 3 },
];

function posOf(cmds: Command[], id: string) {
  const c = cmds.find((x) => x.id === id)!;
  return c.pos as { x: number; y: number };
}

describe("resolveScene 关系→坐标", () => {
  it("所有 entity 都被赋予绝对坐标", () => {
    const out = resolveScene(garfieldScene);
    for (const c of out) {
      expect(typeof (c.pos as { x: number }).x).toBe("number");
      expect(typeof (c.pos as { y: number }).y).toBe("number");
    }
  });

  it("table 用枚举 bottom 落位（下方）", () => {
    const out = resolveScene(garfieldScene);
    const t = posOf(out, "table");
    expect(t.y).toBeGreaterThan(300); // 画布下半部
  });

  it("cat 靠在 table 左边 → x 比 table 小", () => {
    const out = resolveScene(garfieldScene);
    expect(posOf(out, "cat").x).toBeLessThan(posOf(out, "table").x);
  });

  it("pot 在 table 上 → y 比 table 小（更高）", () => {
    const out = resolveScene(garfieldScene);
    expect(posOf(out, "pot").y).toBeLessThan(posOf(out, "table").y);
  });

  it("flower 在 pot 里 → 紧贴 pot", () => {
    const out = resolveScene(garfieldScene);
    const flower = posOf(out, "flower");
    const pot = posOf(out, "pot");
    expect(Math.abs(flower.x - pot.x)).toBeLessThan(40);
  });

  it("按中文实体名引用也能解析（靠在桌子左边）", () => {
    const cmds: Command[] = [
      { op: "create", id: "t1", kind: "entity", entity: "桌子", pos: "center" },
      { op: "create", id: "c1", kind: "entity", entity: "猫", rel: "靠在桌子左边" },
    ];
    const out = resolveScene(cmds);
    expect(posOf(out, "c1").x).toBeLessThan(posOf(out, "t1").x);
  });

  it("无 pos 无 rel → 兜底铺开，不全叠在一起", () => {
    const cmds: Command[] = [
      { op: "create", id: "a", kind: "entity", entity: "猫" },
      { op: "create", id: "b", kind: "entity", entity: "狗" },
    ];
    const out = resolveScene(cmds);
    expect(posOf(out, "a").x).not.toBe(posOf(out, "b").x);
  });

  it("非 create 指令原样返回", () => {
    const cmds: Command[] = [{ op: "undo" }];
    expect(resolveScene(cmds)).toEqual(cmds);
  });
});
