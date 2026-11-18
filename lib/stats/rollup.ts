import { FieldPath } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import type { DayDoc, MonthDoc, Play } from "@/lib/plays/types";
import { addDays, daysInMonth, monthOf, prevMonth, todayKey, yearOf } from "@/lib/time";
import { aggregateHabits } from "./habits";
import { buildMonth } from "./month";
import { computeStreaks, mergeBinges, scanBinges } from "./streaks";
import { discovery, diversity, genreByMonth, recentDiscoveries, series } from "./taste";
import type { AllTimeDoc, Ranked, SeriesDoc, YearDoc } from "./types";

const TOP_N = 200;
const BINGE_SCAN_MAX_DAYS = 400; // per night; a big backlog finishes over several nights

/** Rebuild `stats/month-YYYY-MM` from that month's day docs (at most 31 reads). */
export async function rebuildMonth(month: string): Promise<number> {
  const db = getDb();
  const snaps = await db.getAll(...daysInMonth(month).map((d) => db.doc(`plays/${d}`)));
  const plays = snaps.flatMap((s) => (s.data() as DayDoc | undefined)?.items ?? []);
  if (!plays.length) return 0;
  await db.doc(`stats/month-${month}`).set(buildMonth(month, plays));
  return plays.length;
}

export async function loadMonthDocs(): Promise<MonthDoc[]> {
  const snap = await getDb()
    .collection("stats")
    .where(FieldPath.documentId(), ">=", "month-")
    .where(FieldPath.documentId(), "<", "month.")
    .get();
  return snap.docs.map((d) => d.data() as MonthDoc).sort((a, b) => a.month.localeCompare(b.month));
}

function mergeInto(target: Record<string, number>, src: Record<string, number> | undefined) {
  for (const [k, v] of Object.entries(src ?? {})) target[k] = (target[k] ?? 0) + v;
}

function ranked(count: Record<string, number>, ms: Record<string, number>, by: "count" | "ms"): Ranked[] {
  const ids = new Set([...Object.keys(count), ...Object.keys(ms)]);
  return [...ids]
    .map((id) => ({ id, count: count[id] ?? 0, ms: ms[id] ?? 0 }))
    .filter((r) => (by === "count" ? r.count > 0 : r.ms > 0))
    .sort((a, b) => (by === "count" ? b.count - a.count || b.ms - a.ms : b.ms - a.ms))
    .slice(0, TOP_N);
}

/** Totals and top lists across a set of month docs. */
export function aggregate(label: string, months: MonthDoc[]): YearDoc {
  const trackCount: Record<string, number> = {};
  const trackMs: Record<string, number> = {};
  const artistCount: Record<string, number> = {};
  const artistMs: Record<string, number> = {};
  const totals = { count: 0, ms: 0, plays: 0, skips: 0 };
  for (const m of months) {
    mergeInto(trackCount, m.trackCount);
    mergeInto(trackMs, m.trackMs);
    mergeInto(artistCount, m.artistCount);
    mergeInto(artistMs, m.artistMs);
    totals.count += m.totals?.count ?? 0;
    totals.ms += m.totals?.ms ?? 0;
    totals.plays += m.totals?.plays ?? 0;
    totals.skips += m.totals?.skips ?? 0;
  }
  return {
    year: label,
    totals,
    uniqueTracks: Object.keys(trackMs).length,
    uniqueArtists: Object.keys(artistMs).length,
    topTracks: ranked(trackCount, trackMs, "count"),
    topArtists: ranked(artistCount, artistMs, "count"),
    topTracksByMs: ranked(trackCount, trackMs, "ms"),
    topArtistsByMs: ranked(artistCount, artistMs, "ms"),
    months: months.map((m) => ({ month: m.month, count: m.totals?.count ?? 0, ms: m.totals?.ms ?? 0 })),
  };
}

/**
 * Nightly rollup:
 * 1. rebuild the current month (and the previous one on the 1st–2nd) from day docs,
 * 2. rebuild every `stats/year-*` and `stats/all-time` from the month docs,
 * 3. firsts, heatmap, streaks,
 * 4. extend binge sessions by scanning only the day docs since the last rollup.
 */
export async function rollup() {
  const db = getDb();
  const today = todayKey();
  const current = monthOf(today);
  const toRebuild = Number(today.slice(8)) <= 2 ? [prevMonth(current), current] : [current];
  const rebuilt: Record<string, number> = {};
  for (const m of toRebuild) rebuilt[m] = await rebuildMonth(m);

  const months = await loadMonthDocs();
  const years = [...new Set(months.map((m) => yearOf(m.month)))].sort();

  const batch = db.batch();
  for (const y of years) {
    batch.set(db.doc(`stats/year-${y}`), aggregate(y, months.filter((m) => yearOf(m.month) === y)));
  }

  // Firsts: the month each artist was first heard, and new artists per month.
  const firstMonth: Record<string, string> = {};
  const newArtistsByMonth: Record<string, number> = {};
  const heat: Record<string, number> = {};
  const activeDays: string[] = [];
  for (const m of months) {
    for (const key of Object.keys(m.artistCount ?? {})) {
      if (!firstMonth[key]) {
        firstMonth[key] = m.month;
        newArtistsByMonth[m.month] = (newArtistsByMonth[m.month] ?? 0) + 1;
      }
    }
    mergeInto(heat, m.heat);
    for (const [day, t] of Object.entries(m.days ?? {})) if (t.count > 0) activeDays.push(day);
  }

  // Binges: continue from where the last scan stopped, up to yesterday (complete days only).
  const prev = (await db.doc("stats/all-time").get()).data() as Partial<AllTimeDoc> | undefined;
  const yesterday = addDays(today, -1);
  const scanFrom = prev?.bingeScan?.lastDay ?? "";
  const daysToScan = [...new Set(activeDays)]
    .filter((d) => d > scanFrom && d <= yesterday)
    .sort()
    .slice(0, BINGE_SCAN_MAX_DAYS);
  let carry = prev?.bingeScan?.carry ?? null;
  let binges = prev?.binges ?? [];
  if (daysToScan.length) {
    const snaps = await db.getAll(...daysToScan.map((d) => db.doc(`plays/${d}`)));
    const plays: Play[] = snaps.flatMap((s) => (s.data() as DayDoc | undefined)?.items ?? []);
    const scan = scanBinges(plays, carry);
    carry = scan.carry;
    binges = mergeBinges(binges, scan.found);
  }

  // Taste (level 5): primary genre of every enriched artist.
  const enriched = await db.collection("artists").where("enrichedAt", ">", 0).select("genres").get();
  const primaryGenre = new Map<string, string>();
  enriched.docs.forEach((d) => {
    const g = (d.get("genres") as string[] | undefined)?.[0];
    if (g) primaryGenre.set(d.id, g);
  });
  const taste = genreByMonth(months, primaryGenre);
  const totalMs = months.reduce((s, m) => s + (m.totals?.ms ?? 0), 0);
  const taggedMs = taste.genreMonths.reduce((s, g) => s + g.tagged, 0);

  const summary = aggregate("all-time", months);

  // Timelines for the detail pages (top 300 by minutes; small enough for one doc each).
  const SERIES_N = 300;
  batch.set(db.doc("stats/series-artists"), {
    entries: series(months, "artistCount", "artistMs", summary.topArtistsByMs.slice(0, SERIES_N).map((r) => r.id)),
    builtAt: Date.now(),
  } satisfies SeriesDoc);
  batch.set(db.doc("stats/series-tracks"), {
    entries: series(months, "trackCount", "trackMs", summary.topTracksByMs.slice(0, SERIES_N).map((r) => r.id)),
    builtAt: Date.now(),
  } satisfies SeriesDoc);

  const allTime: AllTimeDoc = {
    ...summary,
    topGenres: taste.topGenres,
    genreMonths: taste.genreMonths,
    eras: taste.eras,
    diversity: diversity(months, taste.genreEffByMonth),
    discovery: discovery(months, firstMonth),
    recentDiscoveries: recentDiscoveries(months, firstMonth),
    tagCoverage: totalMs ? Math.round((taggedMs / totalMs) * 1000) / 1000 : 0,
    ...aggregateHabits(months),
    years,
    heat,
    firstMonth,
    newArtistsByMonth,
    streaks: computeStreaks(activeDays, today),
    binges,
    bingeScan: { lastDay: daysToScan.at(-1) ?? scanFrom, carry },
    rolledUpAt: Date.now(),
  };
  batch.set(db.doc("stats/all-time"), allTime);
  await batch.commit();

  return { rebuilt, months: months.length, years, bingeDaysScanned: daysToScan.length };
}
