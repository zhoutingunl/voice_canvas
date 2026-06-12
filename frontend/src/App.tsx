import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasStage } from "./canvas/CanvasStage";
import { MicIndicator } from "./ui/MicIndicator";
import { CommandLog, type LogEntry } from "./ui/CommandLog";
import { normalize } from "./parser/normalize";
import { ruleParse } from "./parser/rules";
import { applyCommands, initialState, setEntityImage, type CanvasState } from "./engine/canvasReducer";
import { resolveScene } from "./engine/sceneLayout";
import { parseCommand, imagine } from "./api/backend";
import { createASR } from "./asr/createASR";
import type { Command } from "./types/dsl";
import "./App.css";

let logSeq = 0;

export default function App() {
  const [state, setState] = useState<CanvasState>(initialState);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const asr = useMemo(() => createASR("auto"), []);
  const stateRef = useRef(state);
  stateRef.current = state;
  const fetching = useRef<Set<string>>(new Set());

  const pushLog = useCallback((e: Omit<LogEntry, "id">) => {
    logSeq += 1;
    setLogs((prev) => [{ id: logSeq, ...e }, ...prev].slice(0, 30));
  }, []);

  // 对刚创建的 entity 对象触发异步生图（乐观渲染：占位先显示，真图回填）
  const backfillEntities = useCallback(async (cmds: Command[]) => {
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

  const handleText = useCallback(async (raw: string) => {
    const text = normalize(raw);
    if (!text) return;

    // 语音开关
    if (/(停止聆听|别听了|暂停聆听)/.test(text)) { asr.stop(); return; }

    const t0 = performance.now();
    // 1) 规则快路径（本地，零延迟）
    const ruled = ruleParse(text);
    if (ruled) {
      setState((s) => applyCommands(s, ruled));
      pushLog({ text, via: "rule", count: ruled.length, ms: Math.round(performance.now() - t0) });
      void backfillEntities(ruled);
      return;
    }
    // 2) LLM 慢路径（后端 MiniMax-M3）
    try {
      const ctx = {
        objects: stateRef.current.objects.map((o) => ({ id: o.id, kind: o.kind, shape: o.shape })),
        last_id: stateRef.current.lastId,
      };
      const res = await parseCommand(text, ctx);
      // 场景图：把 entity 的相对关系解析为绝对坐标
      const resolved = resolveScene(res.commands);
      setState((s) => applyCommands(s, resolved));
      pushLog({ text, via: "llm", count: resolved.length, ms: Math.round(performance.now() - t0) });
      void backfillEntities(resolved);
    } catch (err) {
      pushLog({ text, via: "error", count: 0, ms: Math.round(performance.now() - t0) });
      console.error(err);
    }
  }, [asr, pushLog, backfillEntities]);

  const startMic = useCallback(() => {
    asr.start({
      onPartial: setPartial,
      onFinal: (t) => { setPartial(""); void handleText(t); },
      onError: (e) => console.warn("ASR:", e),
      onStateChange: setListening,
    });
  }, [asr, handleText]);

  useEffect(() => () => asr.stop(), [asr]);

  const objectsForCtx = state.objects;

  return (
    <div className="app">
      <header className="app__header">
        <h1>VoiceCanvas <small>AI 语音绘图</small></h1>
        <div className="app__controls">
          {!listening
            ? <button className="btn btn--primary" onClick={startMic}>🎤 开始聆听</button>
            : <button className="btn" onClick={() => asr.stop()}>⏹ 停止聆听</button>}
          <span className="app__hint">说："画一个红色的圆" / "画三个圆排成一行" / "撤销" / "清空"</span>
        </div>
      </header>

      <MicIndicator listening={listening} partial={partial} />

      <main className="app__main">
        <div className="app__canvas">
          <CanvasStage objects={objectsForCtx} />
        </div>
        <aside className="app__side">
          <CommandLog entries={logs} />
        </aside>
      </main>
    </div>
  );
}
