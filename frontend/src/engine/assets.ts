// 语义实体的 emoji 素材兜底：生图失败/超时时，用 emoji 占位，
// 既保证场景可读，又避免"生成失败"的破碎观感（design.md §9 兜底）。

const EMOJI: Record<string, string> = {
  加菲猫: "🐱", 猫: "🐱", 小猫: "🐱",
  狗: "🐶", 小狗: "🐶",
  牡丹: "🌸", 花: "🌷", 玫瑰: "🌹", 向日葵: "🌻",
  花盆: "🪴", 盆栽: "🪴",
  桌子: "🪑", 椅子: "🪑",
  树: "🌳", 太阳: "☀️", 月亮: "🌙", 星星: "⭐",
  房子: "🏠", 汽车: "🚗", 苹果: "🍎", 鱼: "🐟", 鸟: "🐦",
};

/** 按实体名取兜底 emoji；找不到返回通用图标。 */
export function entityEmoji(entity?: string): string {
  if (!entity) return "🖼";
  if (EMOJI[entity]) return EMOJI[entity];
  // 包含匹配（如"盛开的牡丹花"含"牡丹"）
  for (const key of Object.keys(EMOJI)) {
    if (entity.includes(key)) return EMOJI[key];
  }
  return "🖼";
}
