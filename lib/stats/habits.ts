import type { Habits, MonthDoc } from "@/lib/plays/types";
import { emptyHabits } from "./month";

export type SkipArtist = { key: string; plays: number; skips: number; rate: number };
export type SkipMonth = { month: string; plays: number; skipped: number; known: number };

const MIN_PLAYS_FOR_RATE = 15;

/** All months' habits merged, skip rate per month, and the most/least skipped artists. */
export function aggregateHabits(months: MonthDoc[]) {
  const all: Habits = emptyHabits();
  const add = (into: Record<string, number>, from: Record<string, number> | undefined) => {
    for (const [k, v] of Object.entries(from ?? {})) into[k] = (into[k] ?? 0) + v;
  };
  const artistPlays: Record<string, number> = {};
  const artistSkips: Record<string, number> = {};
  const skipByMonth: SkipMonth[] = [];

  for (const m of months) {
    const h = m.habits;
    if (h) {
      all.plays += h.plays;
      all.skipped += h.skipped;
      all.skippedEst += h.skippedEst;
      all.shuffleOn += h.shuffleOn;
      all.shuffleOff += h.shuffleOff;
      add(all.platforms, h.platforms);
      add(all.starts, h.starts);
      add(all.ends, h.ends);
    }
    add(artistPlays, m.artistPlays);
    add(artistSkips, m.skips);
    // "known" = plays from the export, where Spotify recorded real skip flags.
    const known = h ? h.shuffleOn + h.shuffleOff : 0;
    skipByMonth.push({ month: m.month, plays: h?.plays ?? 0, skipped: h?.skipped ?? 0, known });
  }

  const rated: SkipArtist[] = Object.entries(artistPlays)
    .filter(([, n]) => n >= MIN_PLAYS_FOR_RATE)
    .map(([key, plays]) => {
      const skips = artistSkips[key] ?? 0;
      return { key, plays, skips, rate: Math.round((skips / plays) * 1000) / 1000 };
    });
  const mostSkipped = [...rated].sort((a, b) => b.rate - a.rate || b.plays - a.plays).slice(0, 12);
  const neverSkipped = [...rated].sort((a, b) => a.rate - b.rate || b.plays - a.plays).slice(0, 12);

  return { habits: all, skipByMonth, mostSkipped, neverSkipped };
}
