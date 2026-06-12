// L3 澄清回问（design.md §10）：低置信度时不硬画，先向用户确认。
// 纯逻辑，便于单测。

import type { Command } from "../types/dsl";

export const CLARIFY_THRESHOLD = 0.7;

const SHAPE_CN: Record<string, string> = {
  circle: "圆", rect: "矩形", ellipse: "椭圆", triangle: "三角形", line: "直线", text: "文字",
};
const OP_CN: Record<string, string> = {
  create: "创建", update: "修改", delete: "删除", move: "移动",
  transform: "变换", clear: "清空", undo: "撤销", redo: "重做",
};

/** 一批指令的整体置信度 = 最不确定的那条（取 min）。空数组返回 1。 */
export function batchConfidence(cmds: Command[]): number {
  if (cmds.length === 0) return 1;
  return Math.min(...cmds.map((c) => (typeof c.confidence === "number" ? c.confidence : 1)));
}

/** 是否需要澄清：任一条标了 needs_clarification，或整体置信度低于阈值。 */
export function needsClarification(cmds: Command[], threshold = CLARIFY_THRESHOLD): boolean {
  if (cmds.length === 0) return false;
  if (cmds.some((c) => c.needs_clarification)) return true;
  return batchConfidence(cmds) < threshold;
}

/** 把一批指令概括成一句中文，用于澄清提示。 */
export function summarize(cmds: Command[]): string {
  if (cmds.length === 0) return "（无操作）";
  // 优先用模型给的 clarify
  const c0 = cmds.find((c) => c.clarify);
  if (c0?.clarify) return c0.clarify;

  const parts = cmds.map((c) => {
    const op = OP_CN[c.op] ?? c.op;
    if (c.op === "create") {
      const what = c.kind === "entity" ? (c.entity ?? "实体") : (SHAPE_CN[c.shape ?? ""] ?? c.shape ?? "图形");
      const color = c.fill ? `${c.fill}的` : "";
      return `${op}${color}${what}`;
    }
    return op;
  });
  // 合并相同项计数
  const counts = new Map<string, number>();
  for (const p of parts) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([p, n]) => (n > 1 ? `${p}×${n}` : p)).join("、");
}

export type Reply = "yes" | "no" | "other";

/** 把用户的语音回复分类为 确认/否定/其它。 */
export function classifyReply(text: string): Reply {
  const t = text.trim();
  if (/(不是|不对|不要|取消|算了|错了|重来|否)/.test(t)) return "no";
  if (/(是|对|确认|没错|可以|好的|好|嗯|YES|yes|OK|ok)/.test(t)) return "yes";
  return "other";
}
