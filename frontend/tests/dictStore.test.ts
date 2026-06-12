import { beforeEach, describe, expect, it } from "vitest";
import {
  addEntry,
  getDefaults,
  getMergedDict,
  getOverrides,
  removeEntry,
} from "../src/parser/dictStore";

beforeEach(() => {
  globalThis.localStorage?.clear();
});

describe("dictStore 同音词典存储", () => {
  it("默认词典不含 _comment，且包含已知条目", () => {
    const d = getDefaults();
    expect(d).not.toHaveProperty("_comment");
    expect(d["园"]).toBe("圆");
  });

  it("新增覆盖项并合并", () => {
    addEntry("香蕉", "圆");
    expect(getOverrides()["香蕉"]).toBe("圆");
    expect(getMergedDict()["香蕉"]).toBe("圆");
  });

  it("覆盖项优先于默认", () => {
    addEntry("园", "矩形"); // 覆盖默认的 园→圆
    expect(getMergedDict()["园"]).toBe("矩形");
  });

  it("删除覆盖项后回退到默认", () => {
    addEntry("园", "矩形");
    removeEntry("园");
    expect(getOverrides()).not.toHaveProperty("园");
    expect(getMergedDict()["园"]).toBe("圆"); // 默认恢复
  });

  it("空 wrong/right 不写入", () => {
    addEntry("  ", "圆");
    expect(Object.keys(getOverrides())).toHaveLength(0);
  });

  it("持久化到 localStorage", () => {
    addEntry("测试", "圆");
    const raw = globalThis.localStorage.getItem("vc_homophones_overrides");
    expect(raw).toContain("测试");
  });
});
