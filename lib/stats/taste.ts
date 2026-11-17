import type { MonthDoc } from "@/lib/plays/types";

/** Genre colours are a fixed 5-slot palette; everything else folds into "other". */
export const GENRE_SLOTS = 5;

export type GenreMonth = { month: string; shares: Record<string, number>; tagged: number; untagged: number };
export type Era = { genre: string; start: string; end: string; months: number; share: number };
export type Diversity = { month: string; artistsEff: number; genresEff: number | null; artists: number };
export type Discovery = { month: string; newArtists: number; stuck: number };
export type SeriesEntry = { months: Record<string, number>; count: number; ms: number; first: string; last: string };

const entropyEff = (values: number[]) => {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const v of values) if (v > 0) h -= (v / total) * Math.log2(v / total);
  return Math.round(2 ** h * 10) / 10; // "effective number" of equally-played items
};

/**
 * Genre share by month: each artist's minutes go to their primary genre.
 * Returns the top genres overall (≤ 5, fixed order) and per-month minutes for
 * those, with the rest folded into "other".
 */
export function genreByMonth(months: MonthDoc[], primaryGenre: Map<string, string>) {
  const full: { month: string; genres: Record<string, number>; untagged: number }[] = [];
  const overall: Record<string, number> = {};
  for (const m of months) {
    const genres: Record<string, number> = {};
    let untagged = 0;
    for (const [key, ms] of Object.entries(m.artistMs ?? {})) {
      const g = primaryGenre.get(key);
      if (!g) {
        untagged += ms;
        continue;
      }
      genres[g] = (genres[g] ?? 0) + ms;
      overall[g] = (overall[g] ?? 0) + ms;
    }
    full.push({ month: m.month, genres, untagged });
  }
  const top = Object.entries(overall)
    .sort((a, b) => b[1] - a[1])
    .slice(0, GENRE_SLOTS)
    .map(([g]) => g);

  const folded: GenreMonth[] = full.map(({ month, genres, untagged }) => {
    const shares: Record<string, number> = {};
    let other = 0;
    let tagged = 0;
    for (const [g, ms] of Object.entries(genres)) {
      tagged += ms;
      if (top.includes(g)) shares[g] = ms;
      else other += ms;
    }
    if (other) shares.other = other;
    return { month, shares, tagged, untagged };
  });
  return { topGenres: top, genreMonths: folded, eras: findEras(full), genreEffByMonth: Object.fromEntries(full.map((f) => [f.month, entropyEff(Object.values(f.genres))])) };
}

/** Eras: 2+ consecutive months where the same genre leads with at least 25% of tagged minutes. */
function findEras(full: { month: string; genres: Record<string, number> }[]): Era[] {
  const leaders = full.map(({ month, genres }) => {
    const total = Object.values(genres).reduce((s, v) => s + v, 0);
    const [g, ms] = Object.entries(genres).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return { month, genre: total > 0 && ms / total >= 0.25 ? g : null, share: total ? ms / total : 0 };
  });
  const eras: Era[] = [];
  let run: (Era & { sum: number }) | null = null;
  const close = () => {
    if (run && run.months >= 2) eras.push({ genre: run.genre, start: run.start, end: run.end, months: run.months, share: Math.round((run.sum / run.months) * 100) / 100 });
    run = null;
  };
  for (const l of leaders) {
    if (l.genre && run?.genre === l.genre) {
      run.end = l.month;
      run.months += 1;
      run.sum += l.share;
    } else {
      close();
      if (l.genre) run = { genre: l.genre, start: l.month, end: l.month, months: 1, share: 0, sum: l.share };
    }
  }
  close();
  return eras;
}

/** Diversity per month: effective number of artists (and genres, when tagged). */
export function diversity(months: MonthDoc[], genreEff: Record<string, number>): Diversity[] {
  return months.map((m) => ({
    month: m.month,
    artistsEff: entropyEff(Object.values(m.artistMs ?? {})),
    genresEff: genreEff[m.month] || null,
    artists: Object.keys(m.artistMs ?? {}).length,
  }));
}

/** New artists per month, and how many "stuck" (3+ streams in the next 3 months). */
export function discovery(months: MonthDoc[], firstMonth: Record<string, string>): Discovery[] {
  const idx = new Map(months.map((m, i) => [m.month, i]));
  const byMonth = new Map<string, { newArtists: number; stuck: number }>();
  for (const [key, first] of Object.entries(firstMonth)) {
    const i = idx.get(first);
    if (i === undefined) continue;
    const entry = byMonth.get(first) ?? { newArtists: 0, stuck: 0 };
    entry.newArtists += 1;
    let later = 0;
    for (let j = i + 1; j <= i + 3 && j < months.length; j++) later += months[j].artistCount?.[key] ?? 0;
    if (later >= 3) entry.stuck += 1;
    byMonth.set(first, entry);
  }
  return months.map((m) => ({ month: m.month, ...(byMonth.get(m.month) ?? { newArtists: 0, stuck: 0 }) }));
}

/** Per-entity monthly stream counts for the top N by minutes (for detail pages). */
export function series(months: MonthDoc[], countKey: "trackCount" | "artistCount", msKey: "trackMs" | "artistMs", ids: string[]) {
  const want = new Set(ids);
  const out: Record<string, SeriesEntry> = {};
  for (const m of months) {
    for (const id of want) {
      const c = m[countKey]?.[id] ?? 0;
      const ms = m[msKey]?.[id] ?? 0;
      if (!c && !ms) continue;
      const e = (out[id] ??= { months: {}, count: 0, ms: 0, first: m.month, last: m.month });
      if (c) e.months[m.month] = c;
      e.count += c;
      e.ms += ms;
      e.last = m.month;
    }
  }
  return out;
}

/** Artists first heard in the last `n` months, most-streamed first. */
export function recentDiscoveries(months: MonthDoc[], firstMonth: Record<string, string>, n = 3, keep = 30) {
  const recent = new Set(months.slice(-n).map((m) => m.month));
  const counts: Record<string, number> = {};
  for (const m of months) {
    if (!recent.has(m.month)) continue;
    for (const [key, c] of Object.entries(m.artistCount ?? {})) if (recent.has(firstMonth[key])) counts[key] = (counts[key] ?? 0) + c;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, keep)
    .map(([key, count]) => ({ key, count, firstMonth: firstMonth[key] }));
}
