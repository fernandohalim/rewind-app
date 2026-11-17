import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase/admin";

/**
 * Scheduled routes check `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron Jobs send it automatically; anything else must send it too.
 * Returns a 401 response when the check fails, or null when it passes.
 */
export function rejectUnlessCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const ok =
    !!secret &&
    got.length === want.length &&
    timingSafeEqual(Buffer.from(got), Buffer.from(want));
  return ok ? null : NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export type JobStatus = { at: number; ok: boolean; ms: number; error?: string; lastOkAt?: number };

/**
 * Record the run: `config/jobs` keeps the latest status per job (one small doc
 * the dashboard reads), and failures are also appended to `jobRuns`.
 * Logging never fails the job.
 */
async function record(name: string, status: JobStatus) {
  try {
    const db = getDb();
    await db.doc("config/jobs").set(
      { [name]: { ...status, ...(status.ok ? { lastOkAt: status.at } : {}) } },
      { merge: true },
    );
    if (!status.ok) await db.collection("jobRuns").add({ job: name, ...status });
  } catch (err) {
    console.error(`[job:${name}] couldn't record status`, err);
  }
}

/** Wraps a job so failures are logged, recorded and returned as JSON instead of an HTML 500. */
export async function runJob(name: string, fn: () => Promise<Record<string, unknown>>) {
  const started = Date.now();
  try {
    const result = await fn();
    const body = { job: name, ok: true, ms: Date.now() - started, ...result };
    console.log(`[job:${name}]`, JSON.stringify(body));
    await record(name, { at: started, ok: true, ms: body.ms });
    return NextResponse.json(body);
  } catch (err) {
    console.error(`[job:${name}] failed`, err);
    const error = err instanceof Error ? err.message : String(err);
    await record(name, { at: started, ok: false, ms: Date.now() - started, error: error.slice(0, 500) });
    return NextResponse.json({ job: name, ok: false, error }, { status: 500 });
  }
}
