"use client";

import { useState } from "react";
import { SERIES } from "@/lib/chart-colors";

export type Point = { key: string; label: string; value: number | null; detail: string };

const W = 720;
const H = 220;
const PAD = { l: 40, r: 12, t: 14, b: 28 };

/** Single-series line that draws left to right, with a crosshair tooltip. */
export function LineChart({ points, unit = "", color = SERIES, highlight }: { points: Point[]; unit?: string; color?: string; highlight?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const vals = points.map((p) => p.value ?? 0);
  const max = Math.max(1, ...vals) * 1.1;
  const x = (i: number) => PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (points.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p.value == null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    pen = true;
  });
  const labelEvery = Math.max(1, Math.ceil(points.length / 10));
  const hi = highlight ? points.findIndex((p) => p.key === highlight) : -1;
  const show = hover ?? (hi >= 0 ? hi : null);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Line chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y((max / 1.1) * f)} y2={y((max / 1.1) * f)} stroke="#1B1A17" strokeOpacity={f === 0 ? 0.25 : 0.07} />
            <text x={PAD.l - 8} y={y((max / 1.1) * f) + 4} textAnchor="end" fontSize={11} fill="#5C574F">
              {Math.round((max / 1.1) * f)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#5C574F">
              {p.label}
            </text>
          ) : null,
        )}
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="line-draw" />
        {points.length <= 12 &&
          points.map((p, i) =>
            p.value == null ? null : <circle key={p.key} cx={x(i)} cy={y(p.value)} r={4.5} fill={color} stroke="#FFFFFF" strokeWidth={2} />,
          )}
        {show !== null && points[show].value != null && (
          <g>
            <line x1={x(show)} x2={x(show)} y1={PAD.t} y2={H - PAD.b} stroke="#1B1A17" strokeOpacity={0.25} strokeDasharray="3 3" />
            <circle cx={x(show)} cy={y(points[show].value!)} r={5} fill={color} stroke="#FFFFFF" strokeWidth={2} />
          </g>
        )}
      </svg>
      {show !== null && points[show].value != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: `${(x(show) / W) * 100}%`, top: `${(y(points[show].value!) / H) * 100}%`, marginTop: -10 }}
        >
          <p className="font-semibold">{points[show].detail}</p>
          <p className="tabular text-white/75">
            {points[show].value} {unit}
          </p>
        </div>
      )}
    </div>
  );
}
