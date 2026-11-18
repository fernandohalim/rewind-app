import { FieldValue } from "firebase-admin/firestore";
import { dayKey, heatKey, monthOf } from "@/lib/time";
import { isStream, type Habits, type MonthDoc, type Play } from "@/lib/plays/types";

type Sums = Omit<MonthDoc, "month">;

const emptySums = (): Sums => ({
  trackCount: {},
  trackMs: {},
  artistCount: {},
  artistMs: {},
  heat: {},
  days: {},
  skips: {},
  artistPlays: {},
  habits: emptyHabits(),
  totals: { count: 0, ms: 0, plays: 0, skips: 0 },
});

export const emptyHabits = (): Habits => ({
  plays: 0,
  skipped: 0,
  skippedEst: 0,
  shuffleOn: 0,
  shuffleOff: 0,
  platforms: {},
  starts: {},
  ends: {},
});

const add = (m: Record<string, number>, k: string, v: number) => {
  m[k] = (m[k] ?? 0) + v;
};

/** Sum plays into month maps. Used both for full rebuilds and for poller deltas. */
export function sumPlays(plays: Play[]): Sums {
  const s = emptySums();
  for (const p of plays) {
    const day = dayKey(p.ts);
    const d = (s.days[day] ??= { count: 0, ms: 0 });
    d.ms += p.msPlayed;
    s.totals.ms += p.msPlayed;
    s.totals.plays += 1;
    add(s.trackMs, p.trackId, p.msPlayed);
    add(s.artistMs, p.artistKey, p.msPlayed);
    add(s.artistPlays!, p.artistKey, 1);
    const h = s.habits!;
    h.plays += 1;
    if (p.skipped === true) h.skipped += 1;
    if (p.skipped === "est") h.skippedEst += 1;
    if (p.shuffle === true) h.shuffleOn += 1;
    if (p.shuffle === false) h.shuffleOff += 1;
    if (p.platform) add(h.platforms, p.platform, 1);
    if (p.reasonStart) add(h.starts, p.reasonStart, 1);
    if (p.reasonEnd) add(h.ends, p.reasonEnd, 1);
    if (p.skipped) {
      add(s.skips, p.artistKey, 1);
      s.totals.skips += 1;
    }
    if (isStream(p)) {
      d.count += 1;
      s.totals.count += 1;
      add(s.trackCount, p.trackId, 1);
      add(s.artistCount, p.artistKey, 1);
      add(s.heat, heatKey(p.ts), 1);
    }
  }
  return s;
}

/** A complete month doc built from that month's plays (rebuilds overwrite the doc). */
export function buildMonth(month: string, plays: Play[]): MonthDoc {
  return { month, ...sumPlays(plays.filter((p) => monthOf(dayKey(p.ts)) === month)) };
}

/**
 * The same sums as nested FieldValue.increment()s, for `set(..., { merge: true })`.
 * Nested object keys are taken literally, so track ids and artist keys with
 * dots or symbols are safe (no dotted field paths involved).
 */
export function incrementsFor(month: string, plays: Play[]) {
  const s = sumPlays(plays);
  const inc = (m: Record<string, number>) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, FieldValue.increment(v)]));
  return {
    month,
    trackCount: inc(s.trackCount),
    trackMs: inc(s.trackMs),
    artistCount: inc(s.artistCount),
    artistMs: inc(s.artistMs),
    heat: inc(s.heat),
    skips: inc(s.skips),
    artistPlays: inc(s.artistPlays!),
    habits: {
      plays: FieldValue.increment(s.habits!.plays),
      skipped: FieldValue.increment(s.habits!.skipped),
      skippedEst: FieldValue.increment(s.habits!.skippedEst),
      shuffleOn: FieldValue.increment(s.habits!.shuffleOn),
      shuffleOff: FieldValue.increment(s.habits!.shuffleOff),
      platforms: inc(s.habits!.platforms),
      starts: inc(s.habits!.starts),
      ends: inc(s.habits!.ends),
    },
    days: Object.fromEntries(
      Object.entries(s.days).map(([d, t]) => [
        d,
        { count: FieldValue.increment(t.count), ms: FieldValue.increment(t.ms) },
      ]),
    ),
    totals: {
      count: FieldValue.increment(s.totals.count),
      ms: FieldValue.increment(s.totals.ms),
      plays: FieldValue.increment(s.totals.plays),
      skips: FieldValue.increment(s.totals.skips),
    },
  };
}

/** Top N entries of a count/ms map, highest first. */
export function topOf(m: Record<string, number> | undefined, n: number): [string, number][] {
  return Object.entries(m ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
