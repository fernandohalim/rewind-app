import { getDb } from "@/lib/firebase/admin";
import { TokenResponse, type SpotifyConfig } from "./types";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const REFRESH_EARLY_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry
const LEASE_MS = 15 * 1000;

/**
 * Read a required env var, tolerating paste accidents: surrounding whitespace,
 * newlines and wrapping quotes are removed.
 */
export function requireEnv(name: string): string {
  const v = (process.env[name] ?? "").trim().replace(/^(['"])(.*)\1$/, "$2").trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function basicAuth(): string {
  const id = requireEnv("SPOTIFY_CLIENT_ID");
  const secret = requireEnv("SPOTIFY_CLIENT_SECRET");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`);
  }
  return TokenResponse.parse(await res.json());
}

/** Swap the authorization code from /api/auth/callback for tokens. */
export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: requireEnv("SPOTIFY_REDIRECT_URI"),
  });
}

const configRef = () => getDb().doc("config/spotify");

/** Save tokens after login. Merges, so pollCursor and exportCutoff survive a re-login. */
export async function saveLogin(spotifyId: string, t: TokenResponse): Promise<void> {
  if (!t.refresh_token) throw new Error("Spotify returned no refresh token");
  const data: Partial<SpotifyConfig> = {
    spotifyId,
    refreshToken: t.refresh_token,
    accessToken: t.access_token,
    expiresAt: Date.now() + t.expires_in * 1000,
    scope: t.scope,
    refreshingUntil: 0,
    connectedAt: Date.now(),
  };
  await configRef().set(data, { merge: true });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A valid access token for background jobs and pages.
 *
 * Refreshes about 5 minutes before expiry. A short lease in a Firestore
 * transaction makes sure only one caller refreshes at a time, so a rotated
 * refresh token is never overwritten by an older one.
 */
export async function getAccessToken(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const now = Date.now();
    const decision = await getDb().runTransaction(async (tx) => {
      const snap = await tx.get(configRef());
      const cfg = snap.data() as SpotifyConfig | undefined;
      if (!cfg?.refreshToken) throw new Error("Spotify isn't connected yet: log in first");
      if (cfg.accessToken && cfg.expiresAt - REFRESH_EARLY_MS > now) {
        return { kind: "valid" as const, token: cfg.accessToken };
      }
      if ((cfg.refreshingUntil ?? 0) > now) return { kind: "wait" as const };
      tx.update(configRef(), { refreshingUntil: now + LEASE_MS });
      return { kind: "refresh" as const, refreshToken: cfg.refreshToken };
    });

    if (decision.kind === "valid") return decision.token;
    if (decision.kind === "wait") {
      await sleep(1000);
      continue;
    }

    try {
      const t = await tokenRequest({
        grant_type: "refresh_token",
        refresh_token: decision.refreshToken,
      });
      await configRef().update({
        accessToken: t.access_token,
        expiresAt: Date.now() + t.expires_in * 1000,
        refreshingUntil: 0,
        ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}),
      });
      return t.access_token;
    } catch (err) {
      await configRef().update({ refreshingUntil: 0 });
      throw err;
    }
  }
  throw new Error("Timed out waiting for another Spotify token refresh");
}
