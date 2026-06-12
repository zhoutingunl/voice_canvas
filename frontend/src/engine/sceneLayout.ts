// 场景图：关系 → 坐标 resolver（design.md §8）。
// 把 entity 指令的 rel（"靠在 table 左边"、"在 pot 里"）解析为绝对坐标，
// 按依赖顺序逐个落位。这是把"一句话描述的场景"变成可摆放对象的关键一步。

import { CANVAS_H, CANVAS_W, type Command } from "../types/dsl";
import { resolvePos } from "./layout";

interface XY {
  x: number;
  y: number;
}

const SPRITE = 140; // entity 渲染尺寸
const GAP = 24;

// 无 pos/rel 时的兜底落位：在中心行从左到右铺开
function defaultPlacement(index: number): XY {
  const step = SPRITE + GAP;
  const startX = CANVAS_W / 2 - step;
  return { x: startX + index * step, y: CANVAS_H / 2 };
}

/** 在 rel 文本中找到它引用的已知对象（按 id 或 entity 名匹配）。 */
function findTarget(
  rel: string,
  known: Map<string, XY>,
  aliases: Map<string, string>,
): XY | null {
  // 先按 id 直接匹配
  for (const id of known.keys()) {
    if (rel.includes(id)) return known.get(id)!;
  }
  // 再按 entity 中文名匹配（映射回 id）
  for (const [name, id] of aliases) {
    if (rel.includes(name) && known.has(id)) return known.get(id)!;
  }
  return null;
}

/** 根据方位词把坐标定位到 target 周围。 */
function placeByRel(rel: string, target: XY): XY {
  const d = SPRITE + GAP;
  if (/(里|内|中间|当中)/.test(rel)) return { x: target.x, y: target.y - 20 }; // 在…里
  if (/上/.test(rel)) return { x: target.x, y: target.y - d * 0.8 }; // 在…上面
  if (/下/.test(rel)) return { x: target.x, y: target.y + d * 0.8 }; // 在…下面
  if (/左/.test(rel)) return { x: target.x - d, y: target.y }; // 在…左
  if (/右/.test(rel)) return { x: target.x + d, y: target.y }; // 在…右
  if (/(旁|边|靠)/.test(rel)) return { x: target.x - d, y: target.y }; // 靠/旁 默认左侧
  return { x: target.x, y: target.y };
}

/**
 * 解析一批指令中的场景关系，为 entity（及缺省定位的对象）补全绝对坐标。
 * 按出现顺序解析，使后出现的对象能引用先出现的对象（LLM 已按依赖顺序输出）。
 */
export function resolveScene(cmds: Command[]): Command[] {
  const known = new Map<string, XY>();
  const aliases = new Map<string, string>();
  let defaultIdx = 0;

  return cmds.map((c) => {
    if (c.op !== "create") return c;

    let p: XY;
    if (c.pos != null) {
      p = resolvePos(c.pos);
    } else if (c.rel) {
      const target = findTarget(c.rel, known, aliases);
      p = target ? placeByRel(c.rel, target) : defaultPlacement(defaultIdx++);
    } else {
      p = defaultPlacement(defaultIdx++);
    }

    if (c.id) known.set(c.id, p);
    if (c.id && c.entity) aliases.set(c.entity, c.id);

    return { ...c, pos: { x: Math.round(p.x), y: Math.round(p.y) } };
  });
}
