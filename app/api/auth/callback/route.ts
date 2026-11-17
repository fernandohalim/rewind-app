import { timingSafeEqual } from "node:crypto";
import { connection, type NextRequest } from "next/server";
import { messagePage, redirectTo } from "@/lib/http";
import { SESSION_COOKIE, STATE_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { spotifyGet } from "@/lib/spotify/client";
import { exchangeCode, saveLogin } from "@/lib/spotify/tokens";
import { Me } from "@/lib/spotify/types";

function failure(step: string, err: unknown) {
  console.error(`[auth/callback] ${step} failed`, err);
  const detail = process.env.NODE_ENV === "development" && err instanceof Error ? err.message : null;
  return messagePage("Something went wrong", [
    { text: `Rewind couldn't ${step}.` },
    ...(detail ? [{ text: detail }] : [{ text: "Check the function logs in Vercel for details." }]),
  ], 500);
}

function sameState(a: string | undefined, b: string | null): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Spotify redirects here after the user approves (or denies) access. */
export async function GET(request: NextRequest) {
  await connection();
  const params = request.nextUrl.searchParams;

  const error = params.get("error");
  if (error) {
    return messagePage("Spotify said no", [
      { text: `Spotify returned “${error}”. If you pressed Cancel, just try again.` },
    ], 400);
  }

  if (!sameState(request.cookies.get(STATE_COOKIE)?.value, params.get("state"))) {
    return messagePage("Login expired", [
      { text: "The login link didn't match or took longer than 10 minutes. Start again from the Rewind login page." },
      { text: "In development, make sure you opened the app at http://127.0.0.1:3000, not localhost." },
    ], 400);
  }

  const code = params.get("code");
  if (!code) return messagePage("Missing code", [{ text: "Spotify didn't send an authorization code." }], 400);

  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  let me: Me;
  try {
    tokens = await exchangeCode(code);
    me = await spotifyGet("/me", Me, { token: tokens.access_token });
  } catch (err) {
    return failure("finish the Spotify login", err);
  }
  const allowed = process.env.ALLOWED_SPOTIFY_ID;

  // First-time setup: tell the owner their id instead of letting anyone in.
  if (!allowed) {
    return messagePage("Almost there", [
      { text: `You're logged in to Spotify as ${me.display_name ?? me.id}. Your Spotify user id is:` },
      { html: `<code>${me.id.replace(/[^A-Za-z0-9._-]/g, "")}</code>` },
      { text: "Set ALLOWED_SPOTIFY_ID to that value in .env.local (and in Vercel), restart the dev server, then log in again." },
    ]);
  }

  if (me.id !== allowed) {
    return messagePage("Not this account", [
      { text: "Rewind is a single-listener app, and this Spotify account isn't the one it belongs to." },
    ], 403);
  }

  try {
    await saveLogin(me.id, tokens);
  } catch (err) {
    return failure("save your Spotify tokens to Firestore", err);
  }

  const res = redirectTo("/");
  res.cookies.set(SESSION_COOKIE, await signSession({ spotifyId: me.id }), sessionCookieOptions);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  return res;
}
