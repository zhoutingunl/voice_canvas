import { describe, expect, it } from "vitest";
import { entityEmoji } from "../src/engine/assets";

describe("entityEmoji 素材兜底", () => {
  it("精确匹配：加菲猫 → 🐱", () => {
    expect(entityEmoji("加菲猫")).toBe("🐱");
  });

  it("包含匹配：盛开的牡丹花 → 🌸", () => {
    expect(entityEmoji("盛开的牡丹花")).toBe("🌸");
  });

  it("未知实体 → 通用图标", () => {
    expect(entityEmoji("外星飞船")).toBe("🖼");
  });

  it("空值 → 通用图标", () => {
    expect(entityEmoji(undefined)).toBe("🖼");
  });
});
