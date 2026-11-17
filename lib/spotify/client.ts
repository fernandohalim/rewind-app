import type { z } from "zod";
import { getAccessToken } from "./tokens";

const API = "https://api.spotify.com/v1";

export class SpotifyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * GET a Spotify Web API path and validate the JSON with a zod schema.
 * Retries once on 429 using Retry-After (capped at 5 s).
 * Pass `token` to use a specific access token (the login callback does).
 */
export async function spotifyGet<S extends z.ZodType>(
  path: string,
  schema: S,
  opts: { token?: string } = {},
): Promise<z.infer<S>> {
  const token = opts.token ?? (await getAccessToken());
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(Number(res.headers.get("Retry-After") ?? 1), 5);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      throw new SpotifyError(res.status, `Spotify GET ${path} failed: ${res.status} ${await res.text()}`);
    }
    return schema.parse(await res.json());
  }
  throw new SpotifyError(429, `Spotify GET ${path} was rate limited`);
}
