// react-konva 画布渲染：按对象模型绘制 shape；entity 渲染占位骨架或图片。

import { Circle, Ellipse, Group, Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useEffect, useState } from "react";
import { CANVAS_H, CANVAS_W, type CanvasObject } from "../types/dsl";

function num(v: unknown, d = 0): number {
  return typeof v === "number" ? v : d;
}

function useHtmlImage(url?: string): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement | undefined>();
  useEffect(() => {
    if (!url) return;
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.src = url;
    im.onload = () => setImg(im);
  }, [url]);
  return img;
}

function EntityNode({ o }: { o: CanvasObject }) {
  const img = useHtmlImage(o.imageUrl);
  const w = 140;
  const h = 140;
  if (o.status === "ready" && img) {
    return <KImage image={img} x={o.x - w / 2} y={o.y - h / 2} width={w} height={h} />;
  }
  // 占位骨架（生成中 / 失败）
  const failed = o.status === "failed";
  return (
    <Group x={o.x - w / 2} y={o.y - h / 2}>
      <Rect width={w} height={h} cornerRadius={10} fill={failed ? "#fde2e2" : "#eef0f3"}
        stroke={failed ? "#e06464" : "#b8bec8"} dash={[8, 6]} />
      <Text width={w} height={h} align="center" verticalAlign="middle" fontSize={15}
        fill={failed ? "#c0392b" : "#6b7280"}
        text={failed ? `⚠ ${o.entity ?? "实体"}\n生成失败` : `🎨 ${o.entity ?? "实体"}\n生成中…`} />
    </Group>
  );
}

function ShapeNode({ o }: { o: CanvasObject }) {
  const common = { fill: o.fill ?? "#444", stroke: o.stroke, rotation: o.rotate ?? 0 };
  switch (o.shape) {
    case "circle":
      return <Circle x={o.x} y={o.y} radius={num(o.geo.r, 40)} {...common} />;
    case "rect": {
      const w = num(o.geo.w, 100);
      const h = num(o.geo.h, 60);
      return <Rect x={o.x - w / 2} y={o.y - h / 2} width={w} height={h} {...common} />;
    }
    case "ellipse":
      return <Ellipse x={o.x} y={o.y} radiusX={num(o.geo.rx, 60)} radiusY={num(o.geo.ry, 40)} {...common} />;
    case "triangle": {
      const s = num(o.geo.size, 80);
      return <Line closed points={[o.x, o.y - s / 2, o.x - s / 2, o.y + s / 2, o.x + s / 2, o.y + s / 2]} {...common} />;
    }
    case "line":
      return <Line points={[o.x, o.y, o.x + num(o.geo.x2, 120), o.y + num(o.geo.y2, 0)]}
        stroke={o.stroke ?? o.fill ?? "#444"} strokeWidth={4} />;
    case "text":
      return <Text x={o.x} y={o.y} text={String(o.geo.content ?? "文字")} fontSize={28} fill={o.fill ?? "#222"} />;
    default:
      return null;
  }
}

export function CanvasStage({ objects, width = CANVAS_W, height = CANVAS_H }: {
  objects: CanvasObject[];
  width?: number;
  height?: number;
}) {
  const sorted = [...objects].sort((a, b) => a.z - b.z);
  return (
    <Stage width={width} height={height} style={{ background: "#fff", borderRadius: 12 }}>
      <Layer>
        {sorted.map((o) =>
          o.kind === "entity" ? <EntityNode key={o.id} o={o} /> : <ShapeNode key={o.id} o={o} />,
        )}
      </Layer>
    </Stage>
  );
}
