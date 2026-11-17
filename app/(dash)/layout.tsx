import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Every dashboard page is per-user and gated by the session, so waiting for
// the cookie check before rendering is correct (Cache Components "block").
export const instant = false;

/**
 * Second check behind proxy.ts: every dashboard page verifies the session
 * itself, so a matcher mistake can't silently expose a page.
 */
export default async function DashLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      {children}
      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 pb-10 pt-4 text-sm text-ink-soft">
        <p>Rewind · data from Spotify. Times in Asia/Jakarta.</p>
        <form action="/api/auth/logout" method="post" className="sm:hidden">
          <button className="rounded-full bg-paper-deep px-4 py-2 font-semibold text-ink">Log out</button>
        </form>
      </footer>
    </div>
  );
}
