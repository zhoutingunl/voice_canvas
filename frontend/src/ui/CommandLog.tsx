// 指令日志：可视化"语音 → 解析路径 → 指令"，体现拆解与延迟来源。

export interface LogEntry {
  id: number;
  text: string;
  via: "rule" | "llm" | "error";
  count: number;
  ms: number;
}

export function CommandLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="log">
      <div className="log__title">指令日志</div>
      {entries.length === 0 && <div className="log__empty">还没有指令。试试说"画一个红色的圆"。</div>}
      {entries.map((e) => (
        <div key={e.id} className={`log__row log__row--${e.via}`}>
          <span className="log__via">{e.via === "rule" ? "规则" : e.via === "llm" ? "LLM" : "错误"}</span>
          <span className="log__text">{e.text}</span>
          <span className="log__meta">{e.via !== "error" ? `${e.count}条 · ${e.ms}ms` : `${e.ms}ms`}</span>
        </div>
      ))}
    </div>
  );
}
