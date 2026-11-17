"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import type { TopLists } from "@/lib/spotify/top";
import { RANGES, type TimeRange } from "@/lib/spotify/types";
import { vtName } from "@/lib/vt";
import { ConfettiBurst } from "./confetti-burst";
import { Cover } from "./cover";
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
    <span className={`w-12 text-center text-sm font-bold ${up ? "text-teal-deep" : "text-vermilion-deep"}`} aria-label={`${up ? "Up" : "Down"} ${Math.abs(m)}`}>
      {up ? "▲" : "▼"} {Math.abs(m)}
    </span>
  );
}

export function TopBoard({ lists, movement, since }: { lists: TopLists; movement: Movement | null; since: string | null }) {
  const [range, setRange] = useState<TimeRange>("short_term");
  const [kind, setKind] = useState<"tracks" | "artists">("tracks");
  const [showAll, setShowAll] = useState(false);
  const reduced = useReducedMotion();

  const rows =
    kind === "tracks"
      ? lists.tracks[range].map((t) => ({ id: t.id, title: t.name, sub: t.artists, image: t.image, url: t.url, href: `/track/${t.id}`, vt: vtName("track", t.id) }))
      : lists.artists[range].map((a) => ({ id: a.id, title: a.name, sub: "", image: a.image, url: a.url, href: `/artist/${encodeURIComponent(a.key)}`, vt: vtName("artist", a.key) }));
  const shown = showAll ? rows : rows.slice(0, 15);
  const moves = movement?.[range][kind];
  const topMove = rows[0] && moves?.[rows[0].id];
  const newNumberOne = topMove === "new" || (typeof topMove === "number" && topMove > 0);

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
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${range === r.key ? "bg-vermilion text-ink shadow" : "text-ink-soft hover:text-ink"}`}
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
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${kind === k ? "bg-plum text-white shadow" : "text-ink-soft hover:text-ink"}`}
            >
              {k}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-soft">Spotify&apos;s ranking{since ? ` · arrows compare with ${since}` : ""}</span>
      </div>

      <LayoutGroup>
        <ol key={kind} className="mt-6 grid gap-3 sm:grid-cols-2">
          {shown.map((row, i) => (
            <motion.li
              key={row.id}
              layout={reduced ? false : "position"}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={reduced ? undefined : { y: -4, rotate: -0.4 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: reduced ? 0 : Math.min(i, 14) * 0.03 }}
              className="tile relative flex items-center gap-2 p-3 pr-4"
            >
              {i === 0 && newNumberOne && <ConfettiBurst fireKey={`${range}-${kind}-${row.id}`} />}
              <Link href={row.href} className="group flex min-w-0 flex-1 items-center gap-3">
                <span className="font-display tabular w-9 text-center text-2xl font-bold text-ink/80">{i + 1}</span>
                <span className="flip-in" style={{ animationDelay: `${Math.min(i, 14) * 40}ms` }}>
                  <Cover src={row.image} vt={row.vt} round={kind === "artists"} className="h-14 w-14 shadow transition-transform group-hover:scale-105" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{row.title}</span>
                  {row.sub && <span className="block truncate text-sm text-ink-soft">{row.sub}</span>}
                </span>
              </Link>
              <MoveChip m={moves ? (moves[row.id] ?? undefined) : undefined} />
              <SpotifyLink href={row.url} />
            </motion.li>
          ))}
        </ol>
      </LayoutGroup>

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
