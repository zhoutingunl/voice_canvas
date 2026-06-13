// react-konva 画布渲染：按对象模型绘制 shape；entity 渲染占位骨架或图片。

import { Circle, Ellipse, Group, Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useEffect, useState } from "react";
import { CANVAS_H, CANVAS_W, type CanvasObject } from "../types/dsl";
import { entityEmoji } from "../engine/assets";

function num(v: unknown, d = 0): number {
  return typeof v === "number" ? v : d;
}

function useHtmlImage(url?: string): { img?: HTMLImageElement; failed: boolean } {
  const [img, setImg] = useState<HTMLImageElement | undefined>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!url) return;
    setImg(undefined);
    setFailed(false);
    const im = new window.Image();
    // 不设 crossOrigin：图床（阿里 OSS）不返回 CORS 头，设了反而触发 403、图片加载失败。
    // 画布仅作展示、不导出，跨域污染无影响。
    im.src = url;
    im.onload = () => setImg(im);
    im.onerror = () => setFailed(true);
  }, [url]);
  return { img, failed };
}

function EntityNode({ o }: { o: CanvasObject }) {
  const { img, failed } = useHtmlImage(o.imageUrl);
  const w = 140;
  const h = 140;
  if (o.status === "ready" && img && !failed) {
    return <KImage image={img} x={o.x - w / 2} y={o.y - h / 2} width={w} height={h} />;
  }
  // 失败 或 图片加载失败：用 emoji 素材兜底（保证场景可读，design.md §9）
  if (o.status === "failed" || (o.status === "ready" && failed)) {
    return (
      <Group x={o.x - w / 2} y={o.y - h / 2}>
        <Text width={w} height={h * 0.7} align="center" verticalAlign="middle" fontSize={72}
          text={entityEmoji(o.entity)} />
        <Text width={w} y={h * 0.72} align="center" fontSize={14} fill="#6b7280" text={o.entity ?? "实体"} />
      </Group>
    );
  }
  // 生成中：占位骨架
  return (
    <Group x={o.x - w / 2} y={o.y - h / 2}>
      <Rect width={w} height={h} cornerRadius={10} fill="#eef0f3" stroke="#b8bec8" dash={[8, 6]} />
      <Text width={w} height={h} align="center" verticalAlign="middle" fontSize={15} fill="#6b7280"
        text={`${entityEmoji(o.entity)} ${o.entity ?? "实体"}\n生成中…`} />
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
