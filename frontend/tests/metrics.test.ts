import { describe, expect, it } from "vitest";
import { computeMetrics } from "../src/engine/metrics";
import type { LogEntry } from "../src/ui/CommandLog";

let seq = 0;
const log = (via: LogEntry["via"], count: number, ms: number): LogEntry => ({
  id: ++seq, text: "t", via, count, ms,
});

describe("computeMetrics", () => {
  it("空日志 → 全 0", () => {
    const m = computeMetrics([]);
    expect(m.total).toBe(0);
    expect(m.execAvgMs).toBe(0);
    expect(m.ruleRatio).toBe(0);
  });

  it("统计图形总数与句数", () => {
    const m = computeMetrics([log("rule", 1, 10), log("llm", 3, 800)]);
    expect(m.total).toBe(4); // 1 + 3
    expect(m.utterances).toBe(2);
  });

  it("按路径分别统计 count 与平均延迟", () => {
    const m = computeMetrics([log("rule", 1, 10), log("rule", 1, 30), log("llm", 2, 900)]);
    expect(m.byVia.rule.count).toBe(2);
    expect(m.byVia.rule.avgMs).toBe(20); // (10+30)/2
    expect(m.byVia.llm.avgMs).toBe(900);
  });

  it("平均/峰值延迟仅计已执行（rule+llm）", () => {
    const m = computeMetrics([log("rule", 1, 10), log("llm", 1, 1000), log("error", 0, 50)]);
    expect(m.execAvgMs).toBe(505); // (10+1000)/2
    expect(m.execMaxMs).toBe(1000);
  });

  it("规则占比与澄清占比", () => {
    const m = computeMetrics([log("rule", 1, 10), log("llm", 1, 500), log("clarify", 1, 600), log("rule", 1, 5)]);
    expect(m.ruleRatio).toBeCloseTo(0.5); // 2/4
    expect(m.clarifyRatio).toBeCloseTo(0.25); // 1/4
  });
});
