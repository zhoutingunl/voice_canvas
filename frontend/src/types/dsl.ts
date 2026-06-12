// VoiceCanvas 指令 DSL 类型定义（与后端 prompts.py / design.md §4 对齐）。

export type Op =
  | "create"
  | "update"
  | "delete"
  | "move"
  | "transform"
  | "clear"
  | "undo"
  | "redo";

export type ShapeKind = "circle" | "rect" | "ellipse" | "line" | "triangle" | "text";

export type Kind = "shape" | "entity";

export type PosEnum =
  | "top-left" | "top" | "top-right"
  | "left" | "center" | "right"
  | "bottom-left" | "bottom" | "bottom-right";

export interface Pos {
  x: number;
  y: number;
}

export type Geo = Record<string, number | string>;

// 单条原子指令
export interface Command {
  op: Op;
  id?: string;
  kind?: Kind;
  // shape
  shape?: ShapeKind;
  geo?: Geo;
  fill?: string;
  stroke?: string;
  // entity
  entity?: string;
  prompt?: string;
  pose?: string;
  rel?: string;
  // 通用
  pos?: Pos | PosEnum;
  z?: number;
  confidence?: number;
  needs_clarification?: boolean;
  clarify?: string;
  // transform 参数
  scale?: number;
  rotate?: number;
}

// 画布上已渲染的对象
export interface CanvasObject {
  id: string;
  kind: Kind;
  shape?: ShapeKind;
  geo: Geo;
  fill?: string;
  stroke?: string;
  x: number;
  y: number;
  z: number;
  rotate?: number;
  // entity 异步生图状态
  entity?: string;
  prompt?: string;
  status?: "pending" | "ready" | "failed";
  imageUrl?: string;
}

export const CANVAS_W = 800;
export const CANVAS_H = 600;
