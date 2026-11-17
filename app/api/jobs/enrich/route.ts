import { connection } from "next/server";
import { rejectUnlessCron, runJob } from "@/lib/cron";
import { enrich } from "@/lib/enrich/run";

export const maxDuration = 300;

/** Daily: Spotify metadata backfill + MusicBrainz/Last.fm enrichment. Stops picking new work at 240 s. */
export async function GET(request: Request) {
  await connection();
  return rejectUnlessCron(request) ?? runJob("enrich", () => enrich(240_000));
}
export const POST = GET;
