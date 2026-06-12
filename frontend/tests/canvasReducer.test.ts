import { describe, expect, it } from "vitest";
import {
  applyCommand,
  applyCommands,
  initialState,
  setEntityImage,
} from "../src/engine/canvasReducer";
import type { Command } from "../src/types/dsl";

const create = (id: string, extra: Partial<Command> = {}): Command => ({
  op: "create", id, kind: "shape", shape: "circle", geo: { r: 40 }, fill: "red", pos: "center", ...extra,
});

describe("canvasReducer", () => {
  it("create 添加对象", () => {
    const s = applyCommand(initialState, create("c1"));
    expect(s.objects).toHaveLength(1);
    expect(s.objects[0].id).toBe("c1");
    expect(s.lastId).toBe("c1");
  });

  it("delete 移除对象", () => {
    let s = applyCommand(initialState, create("c1"));
    s = applyCommand(s, { op: "delete", id: "c1" });
    expect(s.objects).toHaveLength(0);
  });

  it("move 相对位移", () => {
    let s = applyCommand(initialState, create("c1", { pos: { x: 100, y: 100 } }));
    s = applyCommand(s, { op: "move", id: "c1", pos: { x: 50, y: -20 } });
    expect(s.objects[0]).toMatchObject({ x: 150, y: 80 });
  });

  it("update 改颜色", () => {
    let s = applyCommand(initialState, create("c1"));
    s = applyCommand(s, { op: "update", id: "c1", fill: "blue" });
    expect(s.objects[0].fill).toBe("blue");
  });

  it("transform 缩放几何", () => {
    let s = applyCommand(initialState, create("c1"));
    s = applyCommand(s, { op: "transform", id: "c1", scale: 2 });
    expect(s.objects[0].geo.r).toBe(80);
  });

  it("clear 清空", () => {
    let s = applyCommands(initialState, [create("c1"), create("c2")]);
    s = applyCommand(s, { op: "clear" });
    expect(s.objects).toHaveLength(0);
  });

  it("undo 回退一步", () => {
    let s = applyCommand(initialState, create("c1"));
    s = applyCommand(s, create("c2"));
    expect(s.objects).toHaveLength(2);
    s = applyCommand(s, { op: "undo" });
    expect(s.objects).toHaveLength(1);
    expect(s.objects[0].id).toBe("c1");
  });

  it("redo 重做", () => {
    let s = applyCommand(initialState, create("c1"));
    s = applyCommand(s, { op: "undo" });
    expect(s.objects).toHaveLength(0);
    s = applyCommand(s, { op: "redo" });
    expect(s.objects).toHaveLength(1);
  });

  it("create 后清空 future（新分支）", () => {
    let s = applyCommand(initialState, create("c1"));
    s = applyCommand(s, { op: "undo" });
    s = applyCommand(s, create("c2"));
    // 此时不应能 redo 回到 c1
    const before = s.objects;
    s = applyCommand(s, { op: "redo" });
    expect(s.objects).toBe(before);
  });

  it("entity create 初始 pending，可回填图片", () => {
    let s = applyCommand(initialState, { op: "create", id: "cat", kind: "entity", entity: "加菲猫", prompt: "cat" });
    expect(s.objects[0].status).toBe("pending");
    s = setEntityImage(s, "cat", "https://x/cat.png");
    expect(s.objects[0].status).toBe("ready");
    expect(s.objects[0].imageUrl).toBe("https://x/cat.png");
  });

  it("setEntityImage(null) 标记失败", () => {
    let s = applyCommand(initialState, { op: "create", id: "cat", kind: "entity", prompt: "cat" });
    s = setEntityImage(s, "cat", null);
    expect(s.objects[0].status).toBe("failed");
  });

  it("空画布 clear 不产生历史", () => {
    const s = applyCommand(initialState, { op: "clear" });
    expect(s).toBe(initialState);
  });
});
