import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/** Import routes are behind proxy.ts too; this is the second check. Returns a 401 response or null. */
export async function rejectUnlessSession(): Promise<NextResponse | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  return session ? null : NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
