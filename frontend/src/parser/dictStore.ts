// 同音词典存储：默认词典 + 用户在配置页的增改（持久化到 localStorage）。
// 归一化时用合并后的词典（design.md §10：外置 JSON + 配置页）。

import defaultDict from "./homophones.json";

const STORAGE_KEY = "vc_homophones_overrides";

export type Dict = Record<string, string>;

function readOverrides(): Dict {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Dict) : {};
  } catch {
    return {};
  }
}

function writeOverrides(d: Dict): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

/** 默认词典（只读）。 */
export function getDefaults(): Dict {
  const { _comment, ...rest } = defaultDict as Dict & { _comment?: string };
  void _comment;
  return { ...rest };
}

/** 合并词典：用户覆盖优先于默认。 */
export function getMergedDict(): Dict {
  return { ...getDefaults(), ...readOverrides() };
}

/** 用户自定义的覆盖项（配置页展示这部分可删除）。 */
export function getOverrides(): Dict {
  return readOverrides();
}

/** 新增/更新一条纠错（wrong → right）。 */
export function addEntry(wrong: string, right: string): Dict {
  const w = wrong.trim();
  const r = right.trim();
  if (!w || !r) return readOverrides();
  const next = { ...readOverrides(), [w]: r };
  writeOverrides(next);
  return next;
}

/** 删除一条用户自定义纠错。 */
export function removeEntry(wrong: string): Dict {
  const cur = readOverrides();
  delete cur[wrong];
  writeOverrides(cur);
  return cur;
}
