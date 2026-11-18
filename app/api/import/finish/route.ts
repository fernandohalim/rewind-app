import { NextResponse, connection } from "next/server";
import { rejectUnlessSession } from "@/lib/import/auth";
import { BudgetError, FinishBody, finishImport } from "@/lib/import/server";

export const maxDuration = 300;

/** Rebuild months, set the export cutoff and run the rollup once every day is uploaded. */
export async function POST(request: Request) {
  await connection();
  const denied = await rejectUnlessSession();
  if (denied) return denied;

  const parsed = FinishBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  try {
    const result = await finishImport(parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BudgetError) {
      return NextResponse.json({ error: "budget", needed: err.needed, left: err.left, resetsAt: err.resetsAt }, { status: 429 });
    }
    console.error("[import/finish] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
