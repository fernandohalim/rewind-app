import { getJson, pacer } from "./pace";

/**
 * MusicBrainz: ~1 request/second and a descriptive User-Agent with a contact
 * (MB_USER_AGENT, e.g. "Rewind/0.1 ( you@example.com )").
 */
const BASE = "https://musicbrainz.org/ws/2";
const wait = pacer(1100);

const userAgent = () => process.env.MB_USER_AGENT || "Rewind/0.1 ( personal listening stats app )";

async function mb<T>(path: string): Promise<T | null> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}fmt=json`;
  // 503 = MusicBrainz's rate limiter ("server is busy"): back off and retry twice.
  for (let attempt = 0; ; attempt++) {
    await wait();
    try {
      return await getJson<T>(url, { headers: { "User-Agent": userAgent(), Accept: "application/json" } });
    } catch (err) {
      const busy = err instanceof Error && / 503:/.test(err.message);
      if (!busy || attempt >= 2) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

type Credit = { artist: { id: string; name: string } };

/** Artist MBIDs credited on recordings with this ISRC. */
export async function artistsByIsrc(isrc: string): Promise<Credit["artist"][]> {
  const r = await mb<{ recordings?: { "artist-credit"?: Credit[] }[] }>(
    `/isrc/${encodeURIComponent(isrc)}?inc=artist-credits`,
  );
  return (r?.recordings ?? []).flatMap((rec) => (rec["artist-credit"] ?? []).map((c) => c.artist));
}

/** Search by name; only a confident match (score ≥ 90) counts. */
export async function searchArtist(name: string): Promise<{ id: string; name: string } | null> {
  const q = encodeURIComponent(`artist:"${name.replace(/"/g, "")}"`);
  const r = await mb<{ artists?: { id: string; name: string; score: number }[] }>(`/artist?query=${q}&limit=3`);
  const best = (r?.artists ?? []).find((a) => a.score >= 90);
  return best ? { id: best.id, name: best.name } : null;
}

export type MbTag = { name: string; count: number };

export async function artistGenresAndTags(mbid: string): Promise<{ genres: MbTag[]; tags: MbTag[] } | null> {
  const r = await mb<{ genres?: MbTag[]; tags?: MbTag[] }>(`/artist/${mbid}?inc=genres+tags`);
  return r ? { genres: r.genres ?? [], tags: r.tags ?? [] } : null;
}
