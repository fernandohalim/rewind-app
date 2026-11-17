import { connection } from "next/server";
import { rejectUnlessCron, runJob } from "@/lib/cron";
import { rollup } from "@/lib/stats/rollup";

export const maxDuration = 120;

/** Nightly: rebuild year and all-time stats from the month docs. */
export async function GET(request: Request) {
  await connection();
  return rejectUnlessCron(request) ?? runJob("rollup", rollup);
}
export const POST = GET;
