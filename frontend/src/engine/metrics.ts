// QoS 指标聚合（design.md §16）：从指令日志计算路径分布与延迟统计。
// 纯函数，便于单测。

import type { LogEntry } from "../ui/CommandLog";

export interface ViaStat {
  count: number;
  avgMs: number;
}

export interface Metrics {
  total: number; // 总指令条数（已执行的 count 之和）
  utterances: number; // 语音句数（日志条数）
  byVia: Record<LogEntry["via"], ViaStat>;
  execAvgMs: number; // 规则+LLM 的平均端到端延迟
  execMaxMs: number;
  ruleRatio: number; // 规则快路径占比（命中即零延迟）
  clarifyRatio: number; // 澄清触发占比（容错指标）
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function computeMetrics(logs: LogEntry[]): Metrics {
  const vias: LogEntry["via"][] = ["rule", "llm", "clarify", "error"];
  const byVia = {} as Record<LogEntry["via"], ViaStat>;
  for (const v of vias) {
    const rows = logs.filter((l) => l.via === v);
    byVia[v] = { count: rows.length, avgMs: avg(rows.map((r) => r.ms)) };
  }

  const exec = logs.filter((l) => l.via === "rule" || l.via === "llm");
  const execMs = exec.map((l) => l.ms);
  const total = exec.reduce((a, l) => a + l.count, 0);
  const utterances = logs.length;

  return {
    total,
    utterances,
    byVia,
    execAvgMs: avg(execMs),
    execMaxMs: execMs.length ? Math.max(...execMs) : 0,
    ruleRatio: utterances ? byVia.rule.count / utterances : 0,
    clarifyRatio: utterances ? byVia.clarify.count / utterances : 0,
  };
}
