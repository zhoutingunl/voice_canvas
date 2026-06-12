// 位置解析：把九宫格枚举 / 坐标对象解析为画布绝对坐标。
// 相对关系（rel）的坐标求解在场景图 PR 中扩展，这里先处理基础定位。

import { CANVAS_W, CANVAS_H, type Pos, type PosEnum } from "../types/dsl";

const MARGIN = 120;

const ENUM_POS: Record<PosEnum, Pos> = {
  "top-left": { x: MARGIN, y: MARGIN },
  top: { x: CANVAS_W / 2, y: MARGIN },
  "top-right": { x: CANVAS_W - MARGIN, y: MARGIN },
  left: { x: MARGIN, y: CANVAS_H / 2 },
  center: { x: CANVAS_W / 2, y: CANVAS_H / 2 },
  right: { x: CANVAS_W - MARGIN, y: CANVAS_H / 2 },
  "bottom-left": { x: MARGIN, y: CANVAS_H - MARGIN },
  bottom: { x: CANVAS_W / 2, y: CANVAS_H - MARGIN },
  "bottom-right": { x: CANVAS_W - MARGIN, y: CANVAS_H - MARGIN },
};

function isPosEnum(v: unknown): v is PosEnum {
  return typeof v === "string" && v in ENUM_POS;
}

/** 把 pos（枚举/坐标/缺省）解析为绝对坐标。缺省回到画布中心。 */
export function resolvePos(pos: Pos | PosEnum | undefined): Pos {
  if (pos == null) return { ...ENUM_POS.center };
  if (isPosEnum(pos)) return { ...ENUM_POS[pos] };
  if (typeof pos === "object" && typeof pos.x === "number" && typeof pos.y === "number") {
    return { x: pos.x, y: pos.y };
  }
  return { ...ENUM_POS.center };
}

/** move 指令的位移：把 pos 当作相对偏移量叠加到当前坐标。 */
export function applyMove(cur: Pos, delta: Pos | PosEnum | undefined): Pos {
  if (delta && typeof delta === "object" && "x" in delta) {
    return { x: cur.x + delta.x, y: cur.y + delta.y };
  }
  // 若 move 给的是枚举位置，则视为绝对移动到该锚点
  if (isPosEnum(delta)) return resolvePos(delta);
  return cur;
}
