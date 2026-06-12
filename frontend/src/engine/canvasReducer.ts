// 画布状态机：把指令应用到画布对象，并维护撤销/重做（快照栈）。
// 纯函数，便于单元测试（design.md §9：撤销/重做 = 指令重放/回退）。

import type { CanvasObject, Command, Pos } from "../types/dsl";
import { applyMove, resolvePos } from "./layout";

export interface CanvasState {
  objects: CanvasObject[];
  past: CanvasObject[][];
  future: CanvasObject[][];
  lastId?: string;
}

export const initialState: CanvasState = { objects: [], past: [], future: [] };

// 会改变画布内容、需要进入撤销历史的操作
const MUTATING = new Set<Command["op"]>([
  "create", "update", "delete", "move", "transform", "clear",
]);

function snapshot(state: CanvasState): CanvasState {
  return {
    ...state,
    past: [...state.past, state.objects],
    future: [],
  };
}

function commandToObject(cmd: Command): CanvasObject {
  const pos: Pos = resolvePos(cmd.pos);
  return {
    id: cmd.id ?? `obj${Date.now()}`,
    kind: cmd.kind ?? "shape",
    shape: cmd.shape,
    geo: cmd.geo ?? {},
    fill: cmd.fill,
    stroke: cmd.stroke,
    x: pos.x,
    y: pos.y,
    z: cmd.z ?? 1,
    rotate: cmd.rotate,
    entity: cmd.entity,
    prompt: cmd.prompt,
    // entity 需要异步生图，初始 pending；shape 直接 ready
    status: (cmd.kind ?? "shape") === "entity" ? "pending" : "ready",
  };
}

/** 应用单条指令，返回新状态。 */
export function applyCommand(state: CanvasState, cmd: Command): CanvasState {
  switch (cmd.op) {
    case "create": {
      const obj = commandToObject(cmd);
      const next = snapshot(state);
      return { ...next, objects: [...state.objects, obj], lastId: obj.id };
    }
    case "delete": {
      if (!cmd.id) return state;
      const next = snapshot(state);
      return { ...next, objects: state.objects.filter((o) => o.id !== cmd.id) };
    }
    case "move": {
      if (!cmd.id) return state;
      const next = snapshot(state);
      return {
        ...next,
        objects: state.objects.map((o) =>
          o.id === cmd.id ? { ...o, ...applyMove({ x: o.x, y: o.y }, cmd.pos) } : o,
        ),
        lastId: cmd.id,
      };
    }
    case "update": {
      if (!cmd.id) return state;
      const next = snapshot(state);
      return {
        ...next,
        objects: state.objects.map((o) =>
          o.id === cmd.id
            ? {
                ...o,
                fill: cmd.fill ?? o.fill,
                stroke: cmd.stroke ?? o.stroke,
                geo: cmd.geo ? { ...o.geo, ...cmd.geo } : o.geo,
              }
            : o,
        ),
        lastId: cmd.id,
      };
    }
    case "transform": {
      if (!cmd.id) return state;
      const next = snapshot(state);
      const scale = cmd.scale ?? 1;
      return {
        ...next,
        objects: state.objects.map((o) =>
          o.id === cmd.id
            ? {
                ...o,
                rotate: cmd.rotate ?? o.rotate,
                geo: scaleGeo(o.geo, scale),
              }
            : o,
        ),
        lastId: cmd.id,
      };
    }
    case "clear": {
      if (state.objects.length === 0) return state;
      const next = snapshot(state);
      return { ...next, objects: [], lastId: undefined };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        objects: prev,
        past: state.past.slice(0, -1),
        future: [state.objects, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        objects: next,
        past: [...state.past, state.objects],
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

function scaleGeo(geo: CanvasObject["geo"], scale: number): CanvasObject["geo"] {
  const out: CanvasObject["geo"] = {};
  for (const [k, v] of Object.entries(geo)) {
    out[k] = typeof v === "number" ? Math.round(v * scale) : v;
  }
  return out;
}

/** 顺序应用一批指令。 */
export function applyCommands(state: CanvasState, cmds: Command[]): CanvasState {
  return cmds.reduce(applyCommand, state);
}

/** 更新某个 entity 对象的异步生图结果（不进入撤销历史）。 */
export function setEntityImage(
  state: CanvasState,
  id: string,
  imageUrl: string | null,
): CanvasState {
  return {
    ...state,
    objects: state.objects.map((o) =>
      o.id === id
        ? { ...o, status: imageUrl ? "ready" : "failed", imageUrl: imageUrl ?? undefined }
        : o,
    ),
  };
}

export const _internals = { MUTATING };
