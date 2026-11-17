import { randomBytes } from "node:crypto";
import { NextResponse, connection } from "next/server";
import { messagePage } from "@/lib/http";
import { STATE_COOKIE } from "@/lib/session";
import { requireEnv } from "@/lib/spotify/tokens";
import { SCOPES } from "@/lib/spotify/types";

/** Starts the Spotify Authorization Code flow. */
export async function GET() {
  await connection();
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REDIRECT_URI) {
    return messagePage("Spotify isn't set up yet", [
      { text: "Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REDIRECT_URI in .env.local, then restart the dev server." },
    ], 503);
  }
  const state = randomBytes(24).toString("base64url");

  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("SPOTIFY_CLIENT_ID"),
    scope: SCOPES.join(" "),
    redirect_uri: requireEnv("SPOTIFY_REDIRECT_URI"),
    state,
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent on the top-level redirect back from Spotify
    path: "/api/auth",
    maxAge: 10 * 60,
  });
  return res;
}
