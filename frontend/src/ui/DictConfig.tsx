// 同音词典配置页（开发者/管理员设置工具，处于绘图创作流程之外，
// 故可用鼠标键盘，不违背 Voice First；见 design.md §10 边界说明）。

import { useState } from "react";
import { addEntry, getDefaults, getOverrides, removeEntry, type Dict } from "../parser/dictStore";

export function DictConfig({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const [overrides, setOverrides] = useState<Dict>(getOverrides());
  const [wrong, setWrong] = useState("");
  const [right, setRight] = useState("");
  const defaults = getDefaults();

  const add = () => {
    if (!wrong.trim() || !right.trim()) return;
    setOverrides(addEntry(wrong, right));
    setWrong("");
    setRight("");
    onChange();
  };
  const del = (w: string) => {
    setOverrides(removeEntry(w));
    onChange();
  };

  return (
    <div className="cfg">
      <div className="cfg__head">
        <h2>同音词典配置 <small>L1 容错 · 错词 → 正确词</small></h2>
        <button className="btn" onClick={onClose}>← 返回画布</button>
      </div>

      <div className="cfg__add">
        <input placeholder="识别错词（如 园）" value={wrong} onChange={(e) => setWrong(e.target.value)} />
        <span>→</span>
        <input placeholder="正确词（如 圆）" value={right} onChange={(e) => setRight(e.target.value)} />
        <button className="btn btn--primary" onClick={add}>添加</button>
      </div>

      <div className="cfg__cols">
        <div>
          <h3>我的纠错（可删除）</h3>
          {Object.keys(overrides).length === 0 && <p className="cfg__empty">还没有自定义纠错。</p>}
          <ul className="cfg__list">
            {Object.entries(overrides).map(([w, r]) => (
              <li key={w}>
                <code>{w}</code> → <code>{r}</code>
                <button className="cfg__del" onClick={() => del(w)}>删除</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>内置词典（只读，{Object.keys(defaults).length} 条）</h3>
          <ul className="cfg__list cfg__list--ro">
            {Object.entries(defaults).map(([w, r]) => (
              <li key={w}><code>{w}</code> → <code>{r}</code></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
