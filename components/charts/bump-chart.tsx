"use client";

import { useState } from "react";
import { CATEGORICAL, OTHER } from "@/lib/chart-colors";
import { dayLabel } from "@/lib/time";

export type BumpSeries = { id: string; name: string; ranks: (number | null)[] };

const W = 720;
const H = 300;
const PAD = { l: 34, r: 130, t: 14, b: 30 };

/**
 * Rank over time. The top 5 (by the latest rank) get fixed colours and direct
 * labels; the rest are muted. Hover a dot for the exact rank.
 */
export function BumpChart({ dates, series, maxRank = 10 }: { dates: string[]; series: BumpSeries[]; maxRank?: number }) {
  const [hover, setHover] = useState<{ s: number; i: number } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const x = (i: number) => PAD.l + (dates.length === 1 ? 0 : (i / (dates.length - 1)) * (W - PAD.l - PAD.r));
  const y = (rank: number) => PAD.t + ((rank - 1) / (maxRank - 1)) * (H - PAD.t - PAD.b);
  const colorOf = (idx: number) => (idx < CATEGORICAL.length ? CATEGORICAL[idx] : OTHER);

  const path = (ranks: (number | null)[]) => {
    let d = "";
    let pen = false;
    ranks.forEach((r, i) => {
      if (r == null || r > maxRank) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(r).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const tickEvery = Math.max(1, Math.ceil(dates.length / 6));
  // Draw muted series first so coloured ones sit on top.
  const order = series.map((s, idx) => ({ s, idx })).reverse();

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft" aria-label="Legend">
        {series.slice(0, CATEGORICAL.length).map((s, idx) => (
          <li key={s.id}>
            <button
              className="flex items-center gap-1.5 rounded-full px-1 hover:text-ink"
              onMouseEnter={() => setFocus(s.id)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(s.id)}
              onBlur={() => setFocus(null)}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(idx) }} />
              {s.name}
            </button>
          </li>
        ))}
        {series.length > CATEGORICAL.length && (
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: OTHER }} />
            Others in the top {maxRank}
          </li>
        )}
      </ul>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Artist rank over time">
          {Array.from({ length: maxRank }, (_, k) => k + 1).map((r) => (
            <g key={r}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(r)} y2={y(r)} stroke="#1B1A17" strokeOpacity={0.06} />
              <text x={PAD.l - 10} y={y(r) + 4} textAnchor="end" fontSize={11} fill="#5C574F">
                #{r}
              </text>
            </g>
          ))}
          {dates.map((d, i) =>
            i % tickEvery === 0 || i === dates.length - 1 ? (
              <text key={d} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#5C574F">
                {dayLabel(d).replace(/ \d{4}$/, "")}
              </text>
            ) : null,
          )}

          {order.map(({ s, idx }) => {
            const c = colorOf(idx);
            const dim = focus && focus !== s.id;
            return (
              <g key={s.id} opacity={dim ? 0.18 : 1} style={{ transition: "opacity 200ms" }}>
                <path d={path(s.ranks)} fill="none" stroke={c} strokeWidth={idx < CATEGORICAL.length ? 2.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
                {s.ranks.map((r, i) =>
                  r != null && r <= maxRank ? (
                    <g key={i}>
                      <circle cx={x(i)} cy={y(r)} r={4.5} fill={c} stroke="#FFFFFF" strokeWidth={2} />
                      <circle
                        cx={x(i)}
                        cy={y(r)}
                        r={12}
                        fill="transparent"
                        onMouseEnter={() => {
                          setHover({ s: idx, i });
                          setFocus(s.id);
                        }}
                        onMouseLeave={() => {
                          setHover(null);
                          setFocus(null);
                        }}
                      />
                    </g>
                  ) : null,
                )}
                {idx < CATEGORICAL.length && (() => {
                  const last = s.ranks.at(-1);
                  if (last == null || last > maxRank) return null;
                  return (
                    <text x={x(dates.length - 1) + 10} y={y(last) + 4} fontSize={12} fontWeight={600} fill="#1B1A17">
                      {s.name.length > 16 ? `${s.name.slice(0, 15)}…` : s.name}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {hover && (() => {
          const s = series[hover.s];
          const r = s.ranks[hover.i]!;
          return (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: `${(x(hover.i) / W) * 100}%`, top: `${(y(r) / H) * 100}%`, marginTop: -10 }}
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-white/75">
                #{r} on {dayLabel(dates[hover.i])}
              </p>
            </div>
          );
        })()}
      </div>

      <details className="mt-3 text-sm text-ink-soft">
        <summary className="cursor-pointer font-semibold">Show as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="py-1 pr-3">Artist</th>
                {dates.map((d) => (
                  <th key={d} className="px-2 py-1 font-normal">{dayLabel(d).replace(/ \d{4}$/, "")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id} className="border-t border-ink/10">
                  <td className="py-1 pr-3 text-ink">{s.name}</td>
                  {s.ranks.map((r, i) => (
                    <td key={i} className="tabular px-2 py-1">{r ?? "–"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
