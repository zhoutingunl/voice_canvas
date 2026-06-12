// QoS 指标面板：实时展示路径分布与延迟，呼应"响应延迟"考点。

import type { LogEntry } from "./CommandLog";
import { computeMetrics } from "../engine/metrics";

export function MetricsPanel({ logs }: { logs: LogEntry[] }) {
  const m = computeMetrics(logs);
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="metrics">
      <div className="metrics__title">QoS 指标</div>
      <div className="metrics__grid">
        <Stat label="图形总数" value={`${m.total}`} />
        <Stat label="语音句数" value={`${m.utterances}`} />
        <Stat label="规则快路径" value={`${m.byVia.rule.count} · ${m.byVia.rule.avgMs}ms`} hint={pct(m.ruleRatio)} />
        <Stat label="LLM 解析" value={`${m.byVia.llm.count} · ${m.byVia.llm.avgMs}ms`} />
        <Stat label="平均延迟" value={`${m.execAvgMs}ms`} hint={`峰值 ${m.execMaxMs}ms`} />
        <Stat label="澄清触发" value={`${m.byVia.clarify.count}`} hint={pct(m.clarifyRatio)} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="metrics__stat">
      <div className="metrics__label">{label}</div>
      <div className="metrics__value">{value}</div>
      {hint && <div className="metrics__hint">{hint}</div>}
    </div>
  );
}
