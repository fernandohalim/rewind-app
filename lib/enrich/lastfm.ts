import { getJson, pacer } from "./pace";

/** Last.fm: about 1 call a second. Skipped entirely when LASTFM_API_KEY isn't set. */
const BASE = "https://ws.audioscrobbler.com/2.0/";
const wait = pacer(1000);

export const lastfmEnabled = () => !!process.env.LASTFM_API_KEY;

type Who = { mbid?: string | null; name: string };

async function call<T>(method: string, who: Who, extra: Record<string, string> = {}): Promise<T | null> {
  if (!lastfmEnabled()) return null;
  await wait();
  const params = new URLSearchParams({
    method,
    api_key: process.env.LASTFM_API_KEY!,
    format: "json",
    autocorrect: "1",
    ...(who.mbid ? { mbid: who.mbid } : { artist: who.name }),
    ...extra,
  });
  const r = await getJson<T & { error?: number; message?: string }>(`${BASE}?${params}`);
  if (r?.error) {
    // 6 = not found. Retry by name if the MBID was unknown to Last.fm.
    if (r.error === 6 && who.mbid) return call<T>(method, { name: who.name }, extra);
    if (r.error === 6) return null;
    throw new Error(`Last.fm ${method} error ${r.error}: ${r.message}`);
  }
  return r;
}

export async function topTags(who: Who): Promise<{ name: string; count: number }[]> {
  const r = await call<{ toptags?: { tag?: { name: string; count: number }[] } }>("artist.gettoptags", who);
  return (r?.toptags?.tag ?? []).map((t) => ({ name: t.name, count: Number(t.count) || 0 }));
}

export type Similar = { name: string; match: number; mbid?: string; url?: string };

export async function similarArtists(who: Who, limit = 30): Promise<Similar[]> {
  const r = await call<{ similarartists?: { artist?: { name: string; match: string; mbid?: string; url?: string }[] } }>(
    "artist.getsimilar",
    who,
    { limit: String(limit) },
  );
  return (r?.similarartists?.artist ?? []).map((a) => ({
    name: a.name,
    match: Math.round(Number(a.match) * 1000) / 1000,
    ...(a.mbid ? { mbid: a.mbid } : {}),
    ...(a.url ? { url: a.url } : {}),
  }));
}
