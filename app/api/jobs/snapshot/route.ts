import { connection } from "next/server";
import { rejectUnlessCron, runJob } from "@/lib/cron";
import { upsertArtists, upsertTracks } from "@/lib/entities";
import { getDb } from "@/lib/firebase/admin";
import type { SnapshotDoc } from "@/lib/snapshots";
import { fetchTopListsRaw } from "@/lib/spotify/top";
import { RANGES } from "@/lib/spotify/types";
import { todayKey } from "@/lib/time";

export const maxDuration = 60;

/** Level 1 daily snapshot: Spotify's top 50 tracks and artists for all three ranges. */
async function snapshot() {
  const { lists, rawTracks, rawArtists } = await fetchTopListsRaw();
  const date = todayKey();
  const doc: SnapshotDoc = {
    date,
    takenAt: lists.fetchedAt,
    tracks: Object.fromEntries(RANGES.map(({ key }) => [key, lists.tracks[key].map((t) => t.id)])) as SnapshotDoc["tracks"],
    artists: Object.fromEntries(RANGES.map(({ key }) => [key, lists.artists[key].map((a) => a.id)])) as SnapshotDoc["artists"],
  };

  const db = getDb();
  const batch = db.batch();
  batch.set(db.doc(`snapshots/${date}`), doc);
  upsertTracks(batch, rawTracks);
  upsertArtists(batch, rawArtists); // after tracks, so artist images win
  await batch.commit();

  return { date, tracks: rawTracks.length, artists: rawArtists.length };
}

export async function GET(request: Request) {
  await connection();
  return rejectUnlessCron(request) ?? runJob("snapshot", snapshot);
}
export const POST = GET;
