// L1 归一化（本地、零延迟）：去语气词、全角转半角、同音词典纠错。
// 这是容错三层防御的第一层（design.md §10）。

import defaultDict from "./homophones.json";

// 句首/句中的常见语气词与填充词
const FILLER_WORDS = [
  "嗯", "呃", "啊", "唉", "那个", "这个", "就是", "然后", "麻烦", "帮我",
  "请", "我想", "我要", "给我", "来个", "来一个", "搞一个", "搞个", "弄个",
];

// 全角字符转半角（数字/字母/标点）
function toHalfWidth(s: string): string {
  return s.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  ).replace(/　/g, " ");
}

export interface NormalizeOptions {
  dict?: Record<string, string>;
}

/** 把原始 ASR 文本归一化为更干净、更标准的指令文本。 */
export function normalize(raw: string, opts: NormalizeOptions = {}): string {
  const dict = opts.dict ?? (defaultDict as Record<string, string>);
  let s = toHalfWidth(raw || "").trim();

  // 去掉标点（中文逗号句号等）便于匹配
  s = s.replace(/[，。、！？；：,.!?;:]/g, " ");

  // 同音词典纠错（按词长降序，避免短词先替换破坏长词）
  const entries = Object.entries(dict).filter(([k]) => k !== "_comment");
  entries.sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, right] of entries) {
    if (s.includes(wrong)) s = s.split(wrong).join(right);
  }

  // 去语气词/填充词（按长度降序）
  const fillers = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
  for (const f of fillers) {
    s = s.split(f).join("");
  }

  // 合并多余空白
  return s.replace(/\s+/g, " ").trim();
}
