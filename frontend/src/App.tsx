import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasStage } from "./canvas/CanvasStage";
import { MicIndicator } from "./ui/MicIndicator";
import { CommandLog, type LogEntry } from "./ui/CommandLog";
import { MetricsPanel } from "./ui/MetricsPanel";
import { DictConfig } from "./ui/DictConfig";
import { normalize } from "./parser/normalize";
import { getMergedDict } from "./parser/dictStore";
import { ruleParse } from "./parser/rules";
import { applyCommands, initialState, setEntityImage, type CanvasState } from "./engine/canvasReducer";
import { resolveScene } from "./engine/sceneLayout";
import { classifyReply, needsClarification, summarize } from "./engine/clarify";
import { parseCommand, imagine } from "./api/backend";
import { createASR, type ASRMode } from "./asr/createASR";
import type { Command } from "./types/dsl";
import "./App.css";

let logSeq = 0;

interface Pending {
  question: string;
  commands: Command[];
  text: string;
  t0: number;
}

export default function App() {
  const [state, setState] = useState<CanvasState>(initialState);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [view, setView] = useState<"canvas" | "config">("canvas");
  const [pending, setPending] = useState<Pending | null>(null);
  const [dictVersion, setDictVersion] = useState(0);
  const [asrMode, setAsrMode] = useState<ASRMode>("web-speech");

  const asr = useMemo(() => createASR(asrMode), [asrMode]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pendingRef = useRef<Pending | null>(pending);
  pendingRef.current = pending;
  const dict = useMemo(() => getMergedDict(), [dictVersion]);
  const dictRef = useRef(dict);
  dictRef.current = dict;
  const fetching = useRef<Set<string>>(new Set());

  const pushLog = useCallback((e: Omit<LogEntry, "id">) => {
    logSeq += 1;
    setLogs((prev) => [{ id: logSeq, ...e }, ...prev].slice(0, 30));
  }, []);

  // entity 异步生图（乐观渲染：占位先显示，真图回填；失败 emoji 兜底）
  const backfillEntities = useCallback((cmds: Command[]) => {
    for (const c of cmds) {
      if (c.op !== "create" || c.kind !== "entity" || !c.id || !c.prompt) continue;
      if (fetching.current.has(c.id)) continue;
      fetching.current.add(c.id);
      const id = c.id;
      imagine(c.prompt)
        .then((res) => {
          const url = res.urls?.[0] ?? (res.base64 ? `data:image/png;base64,${res.base64}` : null);
          setState((s) => setEntityImage(s, id, url));
        })
        .catch(() => setState((s) => setEntityImage(s, id, null)))
        .finally(() => fetching.current.delete(id));
    }
  }, []);

  // 执行一批指令：场景图解析 → 应用 → 日志 → entity 回填
  const execute = useCallback((cmds: Command[], via: LogEntry["via"], text: string, t0: number) => {
    const resolved = resolveScene(cmds);
    setState((s) => applyCommands(s, resolved));
    pushLog({ text, via, count: resolved.length, ms: Math.round(performance.now() - t0) });
    backfillEntities(resolved);
  }, [pushLog, backfillEntities]);

  const handleText = useCallback(async (raw: string) => {
    const text = normalize(raw, { dict: dictRef.current });
    if (!text) return;

    // 语音开关
    if (/(停止聆听|别听了|暂停聆听)/.test(text)) { asr.stop(); return; }

    // L3：若有待确认项，先处理用户回复
    const p = pendingRef.current;
    if (p) {
      const reply = classifyReply(text);
      if (reply === "yes") {
        setPending(null);
        execute(p.commands, "llm", p.text, p.t0);
        return;
      }
      if (reply === "no") {
        setPending(null);
        pushLog({ text: `已取消：${p.text}`, via: "clarify", count: 0, ms: 0 });
        return;
      }
      // 其它：当作新指令，丢弃旧的待确认项后继续
      setPending(null);
    }

    const t0 = performance.now();
    // 1) 规则快路径（本地，零延迟）—— 高置信度，直接执行
    const ruled = ruleParse(text);
    if (ruled) { execute(ruled, "rule", text, t0); return; }

    // 2) LLM 慢路径（后端 MiniMax-M3）
    try {
      const ctx = {
        objects: stateRef.current.objects.map((o) => ({ id: o.id, kind: o.kind, shape: o.shape })),
        last_id: stateRef.current.lastId,
      };
      const res = await parseCommand(text, ctx);
      // L3：低置信度不硬画，先澄清
      if (needsClarification(res.commands)) {
        const question = `我理解为「${summarize(res.commands)}」，对吗？（说"是"执行，"不是"取消）`;
        setPending({ question, commands: res.commands, text, t0 });
        pushLog({ text: `${text} → 待确认`, via: "clarify", count: res.commands.length, ms: Math.round(performance.now() - t0) });
        return;
      }
      execute(res.commands, "llm", text, t0);
    } catch (err) {
      pushLog({ text, via: "error", count: 0, ms: Math.round(performance.now() - t0) });
      console.error(err);
    }
  }, [asr, pushLog, execute]);

  const startMic = useCallback(() => {
    asr.start({
      onPartial: setPartial,
      onFinal: (t) => { setPartial(""); void handleText(t); },
      onError: (e) => console.warn("ASR:", e),
      onStateChange: setListening,
    });
  }, [asr, handleText]);

  useEffect(() => () => asr.stop(), [asr]);

  // 开发态钩子：供截图/E2E 脚本程序化触发与语音相同的指令流水线（仅 dev，不进生产、无 UI）
  useEffect(() => {
    if (import.meta.env.DEV) {
      (globalThis as Record<string, unknown>).__vcSay = (t: string) => handleText(t);
    }
  }, [handleText]);

  if (view === "config") {
    return <DictConfig onClose={() => setView("canvas")} onChange={() => setDictVersion((v) => v + 1)} />;
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>VoiceCanvas <small>AI 语音绘图</small></h1>
        <div className="app__controls">
          {!listening
            ? <button className="btn btn--primary" onClick={startMic}>🎤 开始聆听</button>
            : <button className="btn" onClick={() => asr.stop()}>⏹ 停止聆听</button>}
          <button className="btn" onClick={() => setView("config")}>⚙ 同音词典</button>
          <div className="asr-switch">
            <span>识别引擎：</span>
            <button className={`asr-switch__opt ${asrMode === "web-speech" ? "is-on" : ""}`}
              onClick={() => { asr.stop(); setAsrMode("web-speech"); }}>Web Speech（免费）</button>
            <button className={`asr-switch__opt ${asrMode === "bailian" ? "is-on" : ""}`}
              onClick={() => { asr.stop(); setAsrMode("bailian"); }}>百炼（云端·稳定）</button>
          </div>
        </div>
        <div className="app__hintline">
          <span className="app__hint">说："画一个红色的圆" / "画三个圆排成一行" / "画一只加菲猫靠在黑桌边" / "撤销" / "清空"</span>
        </div>
      </header>

      <MicIndicator listening={listening} partial={partial}
        engine={asrMode === "bailian" ? "百炼云端 ASR" : "Web Speech"} />

      {pending && (
        <div className="clarify">
          <span className="clarify__icon">❓</span>
          <span className="clarify__q">{pending.question}</span>
        </div>
      )}

      <main className="app__main">
        <div className="app__canvas">
          <CanvasStage objects={state.objects} />
        </div>
        <aside className="app__side">
          <MetricsPanel logs={logs} />
          <CommandLog entries={logs} />
        </aside>
      </main>
    </div>
  );
}
