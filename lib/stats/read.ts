import { vtName } from "@/lib/vt";
import { getDb } from "@/lib/firebase/admin";
import { getEntities, type ArtistDoc, type TrackDoc } from "@/lib/entities";
import { isStream, type DayDoc, type MonthDoc } from "@/lib/plays/types";
import { addDays, todayKey, weekStart } from "@/lib/time";
import { topOf } from "./month";
import type { AllTimeDoc, Ranked, SeriesDoc, YearDoc } from "./types";

export async function getAllTime(): Promise<AllTimeDoc | null> {
  const s = await getDb().doc("stats/all-time").get();
  return s.exists ? (s.data() as AllTimeDoc) : null;
}
export async function getYear(year: string): Promise<YearDoc | null> {
  const s = await getDb().doc(`stats/year-${year}`).get();
  return s.exists ? (s.data() as YearDoc) : null;
}
export async function getSeries(kind: "artists" | "tracks"): Promise<SeriesDoc | null> {
  const s = await getDb().doc(`stats/series-${kind}`).get();
  return s.exists ? (s.data() as SeriesDoc) : null;
}
export async function getMonth(month: string): Promise<MonthDoc | null> {
  const s = await getDb().doc(`stats/month-${month}`).get();
  return s.exists ? (s.data() as MonthDoc) : null;
}

/** A month doc in the same shape as a year doc, so pages can treat them alike. */
export function monthAsSummary(m: MonthDoc, n = 50): YearDoc {
  const rank = (count: Record<string, number>, ms: Record<string, number>, by: "count" | "ms"): Ranked[] =>
    topOf(by === "count" ? count : ms, n).map(([id]) => ({ id, count: count[id] ?? 0, ms: ms[id] ?? 0 }));
  return {
    year: m.month,
    totals: m.totals ?? { count: 0, ms: 0, plays: 0, skips: 0 },
    uniqueTracks: Object.keys(m.trackMs ?? {}).length,
    uniqueArtists: Object.keys(m.artistMs ?? {}).length,
    topTracks: rank(m.trackCount, m.trackMs, "count"),
    topArtists: rank(m.artistCount, m.artistMs, "count"),
    topTracksByMs: rank(m.trackCount, m.trackMs, "ms"),
    topArtistsByMs: rank(m.artistCount, m.artistMs, "ms"),
    months: [],
  };
}

export type NamedRow = Ranked & { name: string; sub?: string; image?: string; url?: string; href: string; vt: string };

/** Attach names and art to ranked ids (one batched read per collection). */
export async function nameRows(tracks: Ranked[], artists: Ranked[]) {
  const [t, a] = await Promise.all([
    getEntities<TrackDoc>("tracks", tracks.map((r) => r.id)),
    getEntities<ArtistDoc>("artists", artists.map((r) => r.id)),
  ]);
  return {
    tracks: tracks.map((r): NamedRow => {
      const d = t.get(r.id);
      return {
        ...r,
        name: d?.name ?? "Unknown track",
        sub: d?.artistName,
        image: d?.album?.image,
        url: d?.url,
        href: `/track/${r.id}`,
        vt: vtName("track", r.id),
      };
    }),
    artists: artists.map((r): NamedRow => {
      const d = a.get(r.id);
      return {
        ...r,
        name: d?.name ?? r.id,
        image: d?.image,
        url: d?.url,
        href: `/artist/${encodeURIComponent(r.id)}`,
        vt: vtName("artist", r.id),
      };
    }),
  };
}

/** The last 14 day docs (today included), small reads, newest last. */
export async function recentDays(n = 14): Promise<{ day: string; doc: DayDoc | null }[]> {
  const db = getDb();
  const today = todayKey();
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
  const snaps = await db.getAll(...days.map((d) => db.doc(`plays/${d}`)));
  return snaps.map((s, i) => ({ day: days[i], doc: s.exists ? (s.data() as DayDoc) : null }));
}

/** Hours this week (Mon–today) vs the same span last week, and the live streak. */
export function weekAndStreak(days: { day: string; doc: DayDoc | null }[], allTime: AllTimeDoc | null) {
  const today = todayKey();
  const ws = weekStart(today);
  const lastWs = addDays(ws, -7);
  const span = days.findIndex((d) => d.day === today) - days.findIndex((d) => d.day === ws);
  const lastEnd = addDays(lastWs, span);
  let thisMs = 0;
  let lastMs = 0;
  const active = new Set<string>();
  for (const { day, doc } of days) {
    const ms = doc?.msTotal ?? 0;
    if (day >= ws) thisMs += ms;
    else if (day >= lastWs && day <= lastEnd) lastMs += ms;
    if (doc?.items.some(isStream)) active.add(day);
  }

  // Walk back from today (or yesterday, if today hasn't started yet).
  let cursor = active.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  // Longer than the window we read: trust the nightly rollup's running streak.
  if (streak >= days.length - 1 && allTime?.streaks.current) {
    const c = allTime.streaks.current;
    streak = Math.max(streak, c.days + (active.has(today) && c.end < today ? 1 : 0));
  }
  return { thisWeekMs: thisMs, lastWeekSameSpanMs: lastMs, streak };
}

export const hours = (ms: number) => ms / 3_600_000;
export const fmtHours = (ms: number) => {
  const h = hours(ms);
  return h >= 10 ? Math.round(h).toLocaleString("en") : h.toFixed(1);
};
