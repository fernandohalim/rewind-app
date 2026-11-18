import { NextResponse, connection } from "next/server";
import { rejectUnlessSession } from "@/lib/import/auth";
import { budget, getImportState } from "@/lib/import/server";

/** Progress of the current import and today's remaining write budget. */
export async function GET() {
  await connection();
  const denied = await rejectUnlessSession();
  if (denied) return denied;
  const state = await getImportState();
  return NextResponse.json({
    importId: state.importId ?? null,
    totalDays: state.totalDays ?? 0,
    daysDone: state.daysDone ?? [],
    finishedAt: state.finishedAt ?? null,
    report: state.report ?? null,
    budget: budget(state),
  });
}
