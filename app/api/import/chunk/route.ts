import { NextResponse, connection } from "next/server";
import { rejectUnlessSession } from "@/lib/import/auth";
import { BudgetError, ChunkBody, writeChunk } from "@/lib/import/server";

export const maxDuration = 120;

/** Store one chunk of cleaned export days (sent by the /import page). */
export async function POST(request: Request) {
  await connection();
  const denied = await rejectUnlessSession();
  if (denied) return denied;

  const parsed = ChunkBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid chunk", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  try {
    return NextResponse.json(await writeChunk(parsed.data));
  } catch (err) {
    if (err instanceof BudgetError) {
      return NextResponse.json(
        { error: "budget", needed: err.needed, left: err.left, resetsAt: err.resetsAt },
        { status: 429 },
      );
    }
    console.error("[import/chunk] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
