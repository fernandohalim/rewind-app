"use client";

import { useState } from "react";
import { SERIES } from "@/lib/chart-colors";

export type Bar = { key: string; label: string; value: number; detail: string };

const W = 720;
const H = 240;
const PAD = { l: 40, r: 8, t: 16, b: 28 };

/** Single-series bars (hours per month). Grows from the baseline; hover for exact values. */
export function MonthBars({ bars, unit = "h", decimals = 1 }: { bars: Bar[]; unit?: string; decimals?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const nice = niceMax(max);
  const plotW = W - PAD.l - PAD.r;
  const slot = plotW / Math.max(1, bars.length);
  const barW = Math.max(4, Math.min(36, slot - 2)); // ≥ 2px surface gap between bars
  const y = (v: number) => PAD.t + (1 - v / nice) * (H - PAD.t - PAD.b);
  const labelEvery = Math.max(1, Math.ceil(bars.length / 12));

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Listening hours per month">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(nice * f)} y2={y(nice * f)} stroke="#1B1A17" strokeOpacity={f === 0 ? 0.25 : 0.07} />
              <text x={PAD.l - 8} y={y(nice * f) + 4} textAnchor="end" fontSize={11} fill="#5C574F">
                {Math.round(nice * f)}
                {unit === "h" ? unit : ""}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const cx = PAD.l + slot * i + slot / 2;
            const top = y(b.value);
            const h = Math.max(0, y(0) - top);
            return (
              <g key={b.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={cx - slot / 2} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} fill="transparent" />
                {h > 0 && (
                  <path
                    className="bar-grow"
                    style={{ animationDelay: `${i * 25}ms`, transformOrigin: `${cx}px ${y(0)}px` }}
                    d={roundedTop(cx - barW / 2, top, barW, h, Math.min(4, barW / 2))}
                    fill={SERIES}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {(i % labelEvery === 0 || i === bars.length - 1) && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="#5C574F">
                    {b.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: `${((PAD.l + slot * hover + slot / 2) / W) * 100}%`,
              top: `${(y(bars[hover].value) / H) * 100}%`,
              marginTop: -8,
            }}
          >
            <p className="font-semibold">{bars[hover].detail}</p>
            <p className="tabular text-white/75">
              {bars[hover].value.toFixed(decimals)} {unit === "h" ? "hours" : unit}
            </p>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm text-ink-soft">
        <summary className="cursor-pointer font-semibold">Show as a table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <tbody>
            {bars.map((b) => (
              <tr key={b.key} className="border-t border-ink/10">
                <td className="py-1 text-ink">{b.detail}</td>
                <td className="tabular py-1 text-right">{b.value.toFixed(decimals)} {unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function niceMax(v: number) {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const s of steps) if (v <= s * 2) return Math.ceil(v / s) * s;
  return Math.ceil(v / 1000) * 1000;
}

/** Bar with 4px rounded data end, square at the baseline. */
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
