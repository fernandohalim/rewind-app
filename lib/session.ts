import { SignJWT, jwtVerify } from "jose";

/**
 * Signed, httpOnly session cookie. Holds only the Spotify user id.
 * Issued by /api/auth/callback (M1) after checking ALLOWED_SPOTIFY_ID.
 */
export const SESSION_COOKIE = "rewind_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
/** CSRF `state` for the Spotify login round trip (scoped to /api/auth). */
export const STATE_COOKIE = "rewind_oauth_state";

export type Session = { spotifyId: string };

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ sid: session.spotifyId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Returns the session if the token is valid and belongs to the allowed user. */
export async function verifySession(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const spotifyId = typeof payload.sid === "string" ? payload.sid : null;
    if (!spotifyId || spotifyId !== process.env.ALLOWED_SPOTIFY_ID) return null;
    return { spotifyId };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
