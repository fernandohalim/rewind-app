import { addDays } from "@/lib/time";
import type { Binge, Streak } from "./types";
import { isStream, type Play } from "@/lib/plays/types";

/**
 * Streaks of consecutive Jakarta days with at least one stream.
 * Returns the top `keep` longest, and the streak still running as of `today`
 * (ending today or yesterday), if any.
 */
export function computeStreaks(activeDays: string[], today: string, keep = 5) {
  const days = [...new Set(activeDays)].sort();
  const all: Streak[] = [];
  let cur: Streak | null = null;
  for (const d of days) {
    if (cur && addDays(cur.end, 1) === d) {
      cur.end = d;
      cur.days += 1;
    } else {
      if (cur) all.push(cur);
      cur = { start: d, end: d, days: 1 };
    }
  }
  if (cur) all.push(cur);
  const last = all.at(-1);
  const current = last && (last.end === today || last.end === addDays(today, -1)) ? last : null;
  const longest = [...all].sort((a, b) => b.days - a.days || b.end.localeCompare(a.end)).slice(0, keep);
  return { longest, current };
}

/**
 * Binge sessions: the same track streamed 5+ times in a row. Plays must be in
 * time order. `carry` continues a run from the previous scan, so runs that
 * cross a day boundary (or a scan boundary) are not split.
 */
export function scanBinges(plays: Play[], carry: Binge | null, min = 5) {
  const found: Binge[] = [];
  let run = carry;
  for (const p of plays) {
    if (!isStream(p)) continue; // skips don't break or extend a binge
    if (run && run.trackId === p.trackId) {
      run.count += 1;
      run.end = p.ts;
    } else {
      if (run && run.count >= min) found.push(run);
      run = { trackId: p.trackId, count: 1, start: p.ts, end: p.ts };
    }
  }
  return { found, carry: run };
}

export function mergeBinges(existing: Binge[], found: Binge[], keep = 20): Binge[] {
  const byStart = new Map(existing.map((b) => [`${b.trackId}@${b.start}`, b]));
  for (const b of found) byStart.set(`${b.trackId}@${b.start}`, b);
  return [...byStart.values()].sort((a, b) => b.count - a.count || b.end - a.end).slice(0, keep);
}
