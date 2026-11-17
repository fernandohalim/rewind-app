import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

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

/** Wraps a job so failures are logged and returned as JSON instead of an HTML 500. */
export async function runJob(name: string, fn: () => Promise<Record<string, unknown>>) {
  const started = Date.now();
  try {
    const result = await fn();
    const body = { job: name, ok: true, ms: Date.now() - started, ...result };
    console.log(`[job:${name}]`, JSON.stringify(body));
    return NextResponse.json(body);
  } catch (err) {
    console.error(`[job:${name}] failed`, err);
    return NextResponse.json(
      { job: name, ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
