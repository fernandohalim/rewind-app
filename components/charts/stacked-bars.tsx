"use client";

import { useState } from "react";

export type StackSeries = { key: string; label: string; color: string };
export type StackRow = { key: string; label: string; detail: string; values: Record<string, number> };

const W = 720;
const H = 240;
const PAD = { l: 36, r: 8, t: 14, b: 28 };

/** Stacked bars with a 2px gap between segments, a legend, hover tooltip and a table view. */
export function StackedBars({ rows, series }: { rows: StackRow[]; series: StackSeries[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = rows.map((r) => series.reduce((s, x) => s + (r.values[x.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const plotW = W - PAD.l - PAD.r;
  const slot = plotW / Math.max(1, rows.length);
  const barW = Math.max(4, Math.min(36, slot - 2));
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const labelEvery = Math.max(1, Math.ceil(rows.length / 12));

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Stacked bar chart">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="#1B1A17" strokeOpacity={f === 0 ? 0.25 : 0.07} />
              <text x={PAD.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize={11} fill="#5C574F">
                {Math.round(max * f)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = PAD.l + slot * i + slot / 2;
            let base = 0;
            return (
              <g key={r.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === i ? 1 : 0.5}>
                <rect x={cx - slot / 2} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} fill="transparent" />
                <g className="bar-grow" style={{ animationDelay: `${i * 25}ms`, transformOrigin: `${cx}px ${y(0)}px` }}>
                  {series.map((s, si) => {
                    const v = r.values[s.key] ?? 0;
                    if (!v) return null;
                    const top = y(base + v);
                    const bottom = y(base);
                    base += v;
                    const isTop = series.slice(si + 1).every((x) => !(r.values[x.key] ?? 0));
                    const h = Math.max(1, bottom - top - (si > 0 ? 2 : 0)); // 2px surface gap
                    return (
                      <rect key={s.key} x={cx - barW / 2} y={top} width={barW} height={h} rx={isTop ? Math.min(4, barW / 2) : 0} fill={s.color} />
                    );
                  })}
                </g>
                {(i % labelEvery === 0 || i === rows.length - 1) && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="#5C574F">
                    {r.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${((PAD.l + slot * hover + slot / 2) / W) * 100}%`, top: `${(y(totals[hover]) / H) * 100}%`, marginTop: -8 }}
          >
            <p className="font-semibold">{rows[hover].detail}</p>
            {series.map((s) => (
              <p key={s.key} className="tabular text-white/80">
                {s.label}: {rows[hover].values[s.key] ?? 0}
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-3 text-sm text-ink-soft">
        <summary className="cursor-pointer font-semibold">Show as a table</summary>
        <table className="mt-2 w-full max-w-md text-left">
          <thead>
            <tr>
              <th className="py-1">Month</th>
              {series.map((s) => <th key={s.key} className="py-1 text-right font-normal">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-ink/10">
                <td className="py-1 text-ink">{r.detail}</td>
                {series.map((s) => <td key={s.key} className="tabular py-1 text-right">{r.values[s.key] ?? 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
