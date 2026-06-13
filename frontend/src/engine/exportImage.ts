// 导出/保存意图识别 + 触发浏览器下载。
// 完成"创作—修改—产出"闭环中的"产出"（design.md：导出语音指令）。

/** 是否为"导出/保存/下载/截图"类语音指令。 */
export function isExportCommand(text: string): boolean {
  return /(导出|保存|下载|截图|存图|存下来)/.test(text);
}

/** 触发浏览器下载一个 dataURL 为 PNG 文件。 */
export function downloadDataUrl(dataUrl: string, filename = "voicecanvas.png"): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
