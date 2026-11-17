"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";
import { CATEGORICAL, OTHER } from "@/lib/chart-colors";
import type { Diversity, GenreMonth } from "@/lib/stats/taste";
import { monthLabel } from "@/lib/time";
import { RewindScrubber } from "./rewind-scrubber";

const W = 720;
const H = 260;
const PAD = { l: 36, r: 8, t: 10, b: 28 };

const title = (g: string) => g.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Genre share over time (100% stacked area by minutes), driven by the Rewind
 * scrubber. The month panel tweens between months.
 */
export function GenreExplorer({
  genres,
  months,
  diversity,
}: {
  genres: string[];
  months: GenreMonth[];
  diversity: Diversity[];
}) {
  const [index, setIndex] = useState(Math.max(0, months.length - 1));
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const onIndex = useCallback((i: number) => setIndex(i), []);

  const order = [...genres, "other"];
  const colorOf = (g: string) => (g === "other" ? OTHER : CATEGORICAL[genres.indexOf(g)] ?? OTHER);
  const shareRows = months.map((m) => {
    const total = Object.values(m.shares).reduce((s, v) => s + v, 0);
    return order.map((g) => (total ? (m.shares[g] ?? 0) / total : 0));
  });

  const n = months.length;
  const x = (i: number) => PAD.l + (n === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (n - 1)) * (W - PAD.l - PAD.r));
  const y = (f: number) => PAD.t + (1 - f) * (H - PAD.t - PAD.b);

  // Build stacked bands bottom-up.
  const bands = order.map((g, gi) => {
    const lower = shareRows.map((r) => r.slice(0, gi).reduce((s, v) => s + v, 0));
    const upper = lower.map((l, i) => l + shareRows[i][gi]);
    const pts = (arr: number[]) => arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    const d =
      n === 1
        ? `M${PAD.l},${y(upper[0])}H${W - PAD.r}V${y(lower[0])}H${PAD.l}Z`
        : `M${pts(upper).join("L")}L${pts(lower).reverse().join("L")}Z`;
    return { g, d };
  });

  const show = hover ?? index;
  const current = shareRows[show] ?? [];
  const div = diversity.find((d) => d.month === months[show]?.month);
  const labelEvery = Math.max(1, Math.ceil(n / 10));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="tile p-5 sm:p-6">
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft" aria-label="Legend">
          {order.map((g) => (
            <li key={g} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(g) }} />
              {g === "other" ? "Everything else" : title(g)}
            </li>
          ))}
        </ul>
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label="Genre share by month"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
              setHover(Math.max(0, Math.min(n - 1, i)));
            }}
            onClick={() => hover !== null && setIndex(hover)}
          >
            {[0, 0.5, 1].map((f) => (
              <text key={f} x={PAD.l - 6} y={y(f) + 4} textAnchor="end" fontSize={11} fill="#5C574F">
                {f * 100}%
              </text>
            ))}
            {bands.map((b) => (
              <path key={b.g} d={b.d} fill={colorOf(b.g)} stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" />
            ))}
            {months.map((m, i) =>
              i % labelEvery === 0 || i === n - 1 ? (
                <text key={m.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#5C574F">
                  {monthLabel(m.month, false)} {m.month.slice(2, 4)}
                </text>
              ) : null,
            )}
            <line x1={x(show)} x2={x(show)} y1={PAD.t} y2={H - PAD.b} stroke="#1B1A17" strokeWidth={2} />
            <circle cx={x(show)} cy={PAD.t} r={5} fill="#1B1A17" />
          </svg>
        </div>
        <details className="mt-3 text-sm text-ink-soft">
          <summary className="cursor-pointer font-semibold">Show as a table</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="py-1 pr-3">Month</th>
                  {order.map((g) => <th key={g} className="px-2 py-1 font-normal">{g === "other" ? "Other" : title(g)}</th>)}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m.month} className="border-t border-ink/10">
                    <td className="py-1 pr-3 text-ink">{monthLabel(m.month)}</td>
                    {shareRows[i].map((v, j) => <td key={j} className="tabular px-2 py-1">{Math.round(v * 100)}%</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-4">
        <RewindScrubber labels={months.map((m) => monthLabel(m.month))} index={index} onIndex={onIndex} />
        <div className="tile p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{monthLabel(months[show]?.month ?? "")}</p>
          <ul className="mt-3 space-y-2.5">
            {order.map((g, gi) => (
              <li key={g}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{g === "other" ? "Everything else" : title(g)}</span>
                  <span className="tabular text-ink-soft">{Math.round((current[gi] ?? 0) * 100)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-paper-deep">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ background: colorOf(g) }}
                    initial={false}
                    animate={{ width: `${(current[gi] ?? 0) * 100}%` }}
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 20 }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {div && (
            <p className="mt-4 border-t border-ink/10 pt-3 text-sm text-ink-soft">
              Diversity: about <span className="font-bold text-ink">{div.artistsEff}</span> artists&apos; worth of variety
              {div.genresEff ? <> across <span className="font-bold text-ink">{div.genresEff}</span> genres</> : null}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
