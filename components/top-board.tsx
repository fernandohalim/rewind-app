"use client";

import { useState } from "react";
import type { TopLists } from "@/lib/spotify/top";
import { RANGES, type TimeRange } from "@/lib/spotify/types";
import { SpotifyLink } from "./spotify";

/** id -> places moved since the last snapshot (positive = up), or "new". */
export type Movement = Record<TimeRange, { tracks: Record<string, number | "new">; artists: Record<string, number | "new"> }>;

function MoveChip({ m }: { m: number | "new" | undefined }) {
  if (m === undefined) return <span className="w-12" />;
  if (m === "new")
    return (
      <span className="wiggle-hover w-12 rounded-full bg-mustard px-2 py-0.5 text-center text-xs font-bold text-ink" style={{ rotate: "-3deg" }}>
        NEW
      </span>
    );
  if (m === 0) return <span className="w-12 text-center text-sm text-ink-soft" aria-label="No change">–</span>;
  const up = m > 0;
  return (
    <span
      className={`w-12 text-center text-sm font-bold ${up ? "text-teal-deep" : "text-vermilion-deep"}`}
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(m)}`}
    >
      {up ? "▲" : "▼"} {Math.abs(m)}
    </span>
  );
}

export function TopBoard({ lists, movement, since }: { lists: TopLists; movement: Movement | null; since: string | null }) {
  const [range, setRange] = useState<TimeRange>("short_term");
  const [kind, setKind] = useState<"tracks" | "artists">("tracks");
  const [showAll, setShowAll] = useState(false);

  const rows =
    kind === "tracks"
      ? lists.tracks[range].map((t) => ({ id: t.id, title: t.name, sub: t.artists, image: t.image, url: t.url }))
      : lists.artists[range].map((a) => ({ id: a.id, title: a.name, sub: "", image: a.image, url: a.url }));
  const shown = showAll ? rows : rows.slice(0, 15);
  const moves = movement?.[range][kind];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Time range" className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink/5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                range === r.key ? "bg-vermilion text-ink shadow" : "text-ink-soft hover:text-ink"
              }`}
            >
              {r.short}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Tracks or artists" className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink/5">
          {(["tracks", "artists"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                kind === k ? "bg-plum text-white shadow" : "text-ink-soft hover:text-ink"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-soft">
          Spotify&apos;s ranking{since ? ` · arrows compare with ${since}` : ""}
        </span>
      </div>

      <ol key={`${range}-${kind}`} className="mt-6 grid gap-3 sm:grid-cols-2">
        {shown.map((row, i) => (
          <li
            key={row.id}
            className="rise tile tile-hover flex items-center gap-3 p-3 pr-4"
            style={{ ["--d" as string]: `${Math.min(i, 14) * 35}ms` }}
          >
            <span className="font-display tabular w-9 text-center text-2xl font-bold text-ink/80">{i + 1}</span>
            {row.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.image}
                alt=""
                className={`h-14 w-14 shrink-0 object-cover shadow ${kind === "artists" ? "rounded-full" : "rounded-xl"}`}
              />
            ) : (
              <span className="h-14 w-14 shrink-0 rounded-xl bg-paper-deep" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{row.title}</p>
              {row.sub && <p className="truncate text-sm text-ink-soft">{row.sub}</p>}
            </div>
            <MoveChip m={moves ? (moves[row.id] ?? undefined) : undefined} />
            <SpotifyLink href={row.url} />
          </li>
        ))}
      </ol>

      {rows.length > 15 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mx-auto mt-6 block rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-plum-deep shadow-[0_12px_24px_-10px_rgba(61,34,102,0.45)] transition hover:-translate-y-0.5"
        >
          {showAll ? "Show top 15" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}
