// 规则快路径（本地、零延迟）：命中高频简单句直接产出指令，绕过 LLM。
// 未命中返回 null → 交给后端 MiniMax-M3 解析（design.md §7）。

import type { Command, PosEnum, ShapeKind } from "../types/dsl";

const COLOR_MAP: Record<string, string> = {
  红: "red", 红色: "red", 蓝: "blue", 蓝色: "blue", 绿: "green", 绿色: "green",
  黄: "yellow", 黄色: "yellow", 黑: "black", 黑色: "black", 白: "white", 白色: "white",
  橙: "orange", 橙色: "orange", 紫: "purple", 紫色: "purple", 灰: "gray", 灰色: "gray",
  粉: "pink", 粉色: "pink",
};

const SHAPE_MAP: Record<string, ShapeKind> = {
  圆: "circle", 圆形: "circle", 圆圈: "circle", 球: "circle",
  方: "rect", 方块: "rect", 方形: "rect", 矩形: "rect", 长方形: "rect", 正方形: "rect",
  椭圆: "ellipse", 椭圆形: "ellipse",
  三角: "triangle", 三角形: "triangle",
  线: "line", 直线: "line", 线条: "line",
  字: "text", 文字: "text", 文本: "text",
};

function defaultGeo(shape: ShapeKind, scale: number): Command["geo"] {
  switch (shape) {
    case "circle": return { r: Math.round(40 * scale) };
    case "rect": return { w: Math.round(100 * scale), h: Math.round(60 * scale) };
    case "ellipse": return { rx: Math.round(60 * scale), ry: Math.round(40 * scale) };
    case "triangle": return { size: Math.round(80 * scale) };
    case "line": return { x2: Math.round(120 * scale), y2: 0 };
    case "text": return { content: "文字" };
    default: return {};
  }
}

// 方位词 → 九宫格（复合词在前，避免"右上"被"右"截断）
const POSITION: [RegExp, PosEnum][] = [
  [/左上/, "top-left"], [/右上/, "top-right"], [/左下/, "bottom-left"], [/右下/, "bottom-right"],
  [/(中间|中央|中心|正中)/, "center"],
  [/(顶部|最上|上方|上边|上面)/, "top"], [/(底部|最下|下方|下边|下面)/, "bottom"],
  [/(左边|左侧|靠左)/, "left"], [/(右边|右侧|靠右)/, "right"],
  [/上/, "top"], [/下/, "bottom"], [/左/, "left"], [/右/, "right"],
];

function parsePosition(t: string): PosEnum | undefined {
  for (const [re, pos] of POSITION) if (re.test(t)) return pos;
  return undefined;
}

// 解析显式数值尺寸（半径/边长/宽高）；无则按 大/小 缩放回退默认。
function parseGeo(t: string, shape: ShapeKind, scale: number): Command["geo"] {
  const radius = t.match(/半径\s*(\d+)/);
  const side = t.match(/(?:边长|大小)\s*(\d+)/);
  const wh = t.match(/宽\s*(\d+)\D*高\s*(\d+)/);
  if (shape === "circle" && radius) return { r: +radius[1] };
  if (shape === "ellipse" && radius) return { rx: +radius[1], ry: Math.round(+radius[1] * 0.7) };
  if (shape === "rect" && wh) return { w: +wh[1], h: +wh[2] };
  if (shape === "rect" && side) return { w: +side[1], h: +side[1] };
  if (shape === "triangle" && side) return { size: +side[1] };
  return defaultGeo(shape, scale);
}

let seq = 0;
function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

/** 仅供测试重置 id 序列。 */
export function _resetSeq(): void {
  seq = 0;
}

/**
 * 尝试用规则解析归一化后的文本。
 * @returns 命令数组（命中），或 null（未命中，需走 LLM）。
 */
export function ruleParse(text: string): Command[] | null {
  const t = text.trim();
  if (!t) return null;

  // 控制类指令
  if (/(清空|清屏|清除|全部删除|删光)/.test(t)) return [{ op: "clear", confidence: 0.98 }];
  if (/(撤销|撤回|后退一步|退回)/.test(t)) return [{ op: "undo", confidence: 0.98 }];
  if (/(重做|恢复|前进一步)/.test(t)) return [{ op: "redo", confidence: 0.98 }];

  // 单个简单图形：画(一个)?(颜色)?(大|小)?<形状>
  if (/(画|绘制|加|添加|来)/.test(t)) {
    const shapeKey = Object.keys(SHAPE_MAP).find((k) => t.includes(k));
    if (shapeKey) {
      // 含数量词（数字/中文数 + 量词）或布局词时不走快路径，交给 LLM 拆解。
      // 注意：数量词需带量词（个/只…），避免把"半径50"的数字误判为数量。
      const quantity = /(两|二|三|四|五|六|七|八|九|十|\d+)\s*(个|只|条|张|块|排)/;
      const layout = /(排成|一行|一列|横排|竖排|并排|网格|方格|矩阵|多个|几个)/;
      if (quantity.test(t) || layout.test(t)) {
        return null;
      }

      const shape = SHAPE_MAP[shapeKey];
      const colorKey = Object.keys(COLOR_MAP).find((k) => t.includes(k));
      const fill = colorKey ? COLOR_MAP[colorKey] : "black";
      const scale = /大/.test(t) ? 1.6 : /小/.test(t) ? 0.6 : 1;

      return [{
        op: "create",
        id: newId(shape[0]),
        kind: "shape",
        shape,
        geo: parseGeo(t, shape, scale),
        fill,
        pos: parsePosition(t) ?? "center",
        confidence: 0.9,
      }];
    }
  }

  return null;
}
