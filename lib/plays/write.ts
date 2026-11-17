import { getDb } from "@/lib/firebase/admin";
import { incrementsFor } from "@/lib/stats/month";
import { dayKey, monthOf } from "@/lib/time";
import type { SpotifyConfig } from "@/lib/spotify/types";
import { playId } from "./keys";
import type { DayDoc, Play } from "./types";

const groupBy = <T,>(xs: T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
};

/**
 * Store new API plays in ONE transaction, so a run that dies halfway leaves
 * nothing behind and a retry starts clean:
 * - drop plays at or before pollCursor / exportCutoff,
 * - drop plays whose trackId+ts is already in their day doc,
 * - append the rest, increment month counters for those only,
 * - move pollCursor to the newest play.
 */
export async function writeNewPlays(plays: Play[]): Promise<{ added: number; days: string[] }> {
  const db = getDb();
  const configRef = db.doc("config/spotify");

  return db.runTransaction(async (tx) => {
    const cfg = ((await tx.get(configRef)).data() ?? {}) as Partial<SpotifyConfig>;
    const floor = Math.max(cfg.pollCursor ?? 0, cfg.exportCutoff ?? 0);
    const fresh = plays.filter((p) => p.ts > floor);
    if (!fresh.length) return { added: 0, days: [] };

    const byDay = groupBy(fresh, (p) => dayKey(p.ts));
    const dayRefs = [...byDay.keys()].map((d) => db.doc(`plays/${d}`));
    const snaps = await tx.getAll(...dayRefs);

    // All reads are done; from here on only writes.
    const added: Play[] = [];
    snaps.forEach((snap, i) => {
      const day = snap.id;
      const existing = (snap.data() as DayDoc | undefined)?.items ?? [];
      const known = new Set(existing.map(playId));
      const incoming = byDay.get(day)!.filter((p) => !known.has(playId(p)));
      if (!incoming.length) return;
      const items = [...existing, ...incoming].sort((a, b) => a.ts - b.ts);
      tx.set(dayRefs[i], {
        day,
        items,
        count: items.length,
        msTotal: items.reduce((s, p) => s + p.msPlayed, 0),
      } satisfies DayDoc);
      added.push(...incoming);
    });

    for (const [month, monthPlays] of groupBy(added, (p) => monthOf(dayKey(p.ts)))) {
      tx.set(db.doc(`stats/month-${month}`), incrementsFor(month, monthPlays), { merge: true });
    }

    const newest = Math.max(...fresh.map((p) => p.ts));
    tx.set(configRef, { pollCursor: newest, lastPollAt: Date.now() }, { merge: true });
    return { added: added.length, days: [...new Set(added.map((p) => dayKey(p.ts)))] };
  });
}
