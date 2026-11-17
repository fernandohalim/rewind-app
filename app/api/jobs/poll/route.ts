import { connection } from "next/server";
import { rejectUnlessCron, runJob } from "@/lib/cron";
import { upsertTracks } from "@/lib/entities";
import { getDb } from "@/lib/firebase/admin";
import { artistKey } from "@/lib/plays/keys";
import type { Play } from "@/lib/plays/types";
import { writeNewPlays } from "@/lib/plays/write";
import { spotifyGet } from "@/lib/spotify/client";
import { RecentlyPlayed, type SpotifyConfig } from "@/lib/spotify/types";

export const maxDuration = 60;

/** A gap longer than this between plays means "a fresh session", not a partial play. */
const SESSION_GAP_MS = 30 * 60 * 1000;

/**
 * Level 2 poller, every 30 minutes. Fetches the newest 50 plays (no `after`
 * cursor) and stores the ones it hasn't seen. Safe to run twice.
 */
async function poll() {
  const db = getDb();
  const cfg = ((await db.doc("config/spotify").get()).data() ?? {}) as Partial<SpotifyConfig>;
  const cursor = cfg.pollCursor ?? 0;

  const recent = await spotifyGet("/me/player/recently-played?limit=50", RecentlyPlayed);
  const items = recent.items
    .filter((i) => i.track.id && (i.track.type ?? "track") === "track")
    .map((i) => ({ ts: Date.parse(i.played_at), track: i.track }))
    .sort((a, b) => a.ts - b.ts);
  if (!items.length) return { fetched: 0, added: 0 };

  // played_at is when a play ended, so the time since the previous play ended
  // caps how long this one can have played. Shorter than the track → partial play.
  const plays: Play[] = items.map((item, i) => {
    const prevEnd = i > 0 ? items[i - 1].ts : cursor || null;
    const gap = prevEnd ? item.ts - prevEnd : Infinity;
    const duration = item.track.duration_ms;
    const ms = gap < SESSION_GAP_MS ? Math.min(duration, gap) : duration;
    const partial = ms < duration - 10_000;
    return {
      ts: item.ts,
      trackId: item.track.id!,
      artistKey: artistKey(item.track.artists[0]?.name),
      msPlayed: ms,
      msEst: true,
      ...(partial ? { skipped: "est" as const } : {}),
      src: "api",
    };
  });

  const { added, days } = await writeNewPlays(plays);

  if (added) {
    const batch = db.batch();
    upsertTracks(batch, items.filter((i) => i.ts > cursor).map((i) => i.track));
    await batch.commit();
  }

  // Gap check: if even the oldest of the 50 is newer than the cursor,
  // plays in between were probably lost.
  let gap = false;
  if (cursor && items.length >= 50 && items[0].ts > cursor) {
    gap = true;
    await db.collection("gaps").add({ from: cursor, to: items[0].ts, foundAt: Date.now() });
  }

  return { fetched: items.length, added, days, gap };
}

export async function GET(request: Request) {
  await connection();
  return rejectUnlessCron(request) ?? runJob("poll", poll);
}
export const POST = GET;
