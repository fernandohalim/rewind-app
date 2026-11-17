import { NextResponse } from "next/server";

/**
 * Redirect with a relative Location header, so the browser stays on the host
 * it used. In dev, `request.url` reports `localhost` even when you're on
 * 127.0.0.1, which would drop cookies set on 127.0.0.1 (Spotify requires it).
 * For route handlers only: proxy.ts needs an absolute URL.
 */
export function redirectTo(path: string, status: 303 | 307 = 307): NextResponse {
  return new NextResponse(null, { status, headers: { Location: path } });
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * A small standalone page for auth outcomes (errors, first-time setup).
 * `html` in body lines is NOT escaped: only pass trusted, already-escaped markup.
 */
export function messagePage(
  title: string,
  lines: { text?: string; html?: string }[],
  status = 200,
): NextResponse {
  const body = lines
    .map((l) => `<p>${l.html ?? escape(l.text ?? "")}</p>`)
    .join("");
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · Rewind</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;font-family:system-ui,sans-serif;color:#1b1a17;
    background:linear-gradient(135deg,#3d2266 0%,#7b4b94 30%,#d9667e 62%,#e4572e 82%,#e9b44c 100%)}
  main{background:#fff;border-radius:28px;padding:28px;max-width:460px;width:100%;box-shadow:0 28px 50px -14px rgba(61,34,102,.45)}
  h1{font-family:Georgia,serif;font-size:28px;margin:0 0 12px}
  p{line-height:1.55;color:#5c574f;margin:8px 0}
  code{background:#f4efe6;padding:2px 8px;border-radius:8px;color:#1b1a17;font-size:15px;user-select:all}
  a{display:inline-block;margin-top:16px;background:#e4572e;color:#1b1a17;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:999px}
</style></head><body><main><h1>${escape(title)}</h1>${body}<a href="/login">Back to Rewind</a></main></body></html>`;
  return new NextResponse(page, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
