/** Minimal pacer: each `wait()` resolves no sooner than `gapMs` after the previous one. */
export function pacer(gapMs: number) {
  let next = 0;
  return async function wait() {
    const now = Date.now();
    const at = Math.max(now, next);
    next = at + gapMs;
    if (at > now) await new Promise((r) => setTimeout(r, at - now));
  };
}

/** fetch → JSON with a timeout; returns null on 404. */
export async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T | null> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}
