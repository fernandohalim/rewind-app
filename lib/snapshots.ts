import { getDb } from "@/lib/firebase/admin";
import type { TimeRange } from "@/lib/spotify/types";

/** `snapshots/{YYYY-MM-DD}`: ranked ids for each range (rank = index + 1). */
export type SnapshotDoc = {
  date: string;
  takenAt: number;
  tracks: Record<TimeRange, string[]>;
  artists: Record<TimeRange, string[]>;
};

/** The most recent snapshots, newest first. */
export async function recentSnapshots(limit: number): Promise<SnapshotDoc[]> {
  const snap = await getDb().collection("snapshots").orderBy("date", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as SnapshotDoc);
}
