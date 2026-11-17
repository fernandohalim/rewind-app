"use client";

import { useState } from "react";
import { HEAT_SCALE, heatColor } from "@/lib/chart-colors";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Hour × weekday heatmap of streams (Asia/Jakarta). Cells pop in row by row. */
export function Heatmap({ heat }: { heat: Record<string, number> }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(0, ...Object.values(heat));
  const v = (d: number, h: number) => heat[`${d}_${h}`] ?? 0;
  const peak = Object.entries(heat).sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <div className="overflow-x-auto p-1 md:overflow-visible">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-[3px]">
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center text-[10px] text-ink-soft">
                {h % 3 === 0 ? h : ""}
              </span>
            ))}
            {DAYS.map((name, d) => (
              <Row key={name} name={name} d={d} v={v} max={max} onHover={setHover} hover={hover} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
        <p className="min-h-5">
          {hover ? (
            <>
              <span className="font-semibold text-ink">
                {DAYS[hover.d]} {String(hover.h).padStart(2, "0")}:00
              </span>{" "}
              · {v(hover.d, hover.h).toLocaleString("en")} streams
            </>
          ) : peak ? (
            <>
              Peak: <span className="font-semibold text-ink">{DAYS[Number(peak[0].split("_")[0])]} {peak[0].split("_")[1].padStart(2, "0")}:00</span> ·{" "}
              {peak[1].toLocaleString("en")} streams
            </>
          ) : (
            "No streams yet"
          )}
        </p>
        <div className="flex items-center gap-1" aria-label="Colour scale, fewer to more streams">
          <span>fewer</span>
          {HEAT_SCALE.map((c) => (
            <span key={c} className="h-3 w-5 rounded-[3px]" style={{ background: c }} />
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  name,
  d,
  v,
  max,
  onHover,
  hover,
}: {
  name: string;
  d: number;
  v: (d: number, h: number) => number;
  max: number;
  onHover: (x: { d: number; h: number } | null) => void;
  hover: { d: number; h: number } | null;
}) {
  return (
    <>
      <span className="self-center text-xs font-semibold text-ink-soft">{name}</span>
      {Array.from({ length: 24 }, (_, h) => {
        const val = v(d, h);
        const on = hover?.d === d && hover?.h === h;
        return (
          <span
            key={h}
            role="img"
            aria-label={`${name} ${h}:00, ${val} streams`}
            onMouseEnter={() => onHover({ d, h })}
            onMouseLeave={() => onHover(null)}
            className="cell-pop aspect-square rounded-[4px] transition-transform"
            style={{
              background: heatColor(val, max),
              animationDelay: `${d * 70 + h * 6}ms`,
              transform: on ? "scale(1.25)" : undefined,
              boxShadow: on ? "0 0 0 2px #1B1A17" : undefined,
            }}
          />
        );
      })}
    </>
  );
}
