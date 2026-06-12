// 聆听状态指示器：大号、触屏友好（无鼠标键盘下仍需清晰可见）。

export function MicIndicator({ listening, partial, engine }: { listening: boolean; partial: string; engine?: string }) {
  return (
    <div className={`mic ${listening ? "mic--on" : "mic--off"}`}>
      <div className="mic__dot" />
      <div className="mic__label">
        {listening ? (partial ? `聆听中：${partial}` : "聆听中…请说出绘图指令") : "已停止聆听"}
      </div>
      {engine && <div className="mic__engine">{engine}</div>}
    </div>
  );
}
