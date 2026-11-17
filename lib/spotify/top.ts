import { artistKey } from "@/lib/plays/keys";
import { spotifyGet } from "./client";
import { RANGES, TopArtists, TopTracks, type Artist, type TimeRange, type Track } from "./types";

/** Slim, serializable shapes for pages and snapshots. */
export type TopTrack = {
  id: string;
  name: string;
  artists: string;
  artistKey: string;
  image?: string;
  url?: string;
};
export type TopArtist = { id: string; key: string; name: string; image?: string; url?: string };
export type TopLists = {
  tracks: Record<TimeRange, TopTrack[]>;
  artists: Record<TimeRange, TopArtist[]>;
  fetchedAt: number;
};

const img = (imgs?: { url: string; width?: number | null }[]) =>
  imgs?.find((i) => (i.width ?? 0) >= 160 && (i.width ?? 0) <= 400)?.url ?? imgs?.[0]?.url;

const slimTrack = (t: Track): TopTrack => ({
  id: t.id!,
  name: t.name,
  artists: t.artists.map((a) => a.name).join(", "),
  artistKey: artistKey(t.artists[0]?.name),
  image: img(t.album?.images),
  url: t.external_urls?.spotify,
});
const slimArtist = (a: Artist): TopArtist => ({
  id: a.id,
  key: artistKey(a.name),
  name: a.name,
  image: img(a.images),
  url: a.external_urls?.spotify,
});

/** Spotify's own top-50 rankings for all three ranges (6 calls). Raw objects included for entity upserts. */
export async function fetchTopListsRaw() {
  const calls = RANGES.flatMap(({ key }) => [
    spotifyGet(`/me/top/tracks?time_range=${key}&limit=50`, TopTracks).then((r) => ({ key, kind: "tracks" as const, r })),
    spotifyGet(`/me/top/artists?time_range=${key}&limit=50`, TopArtists).then((r) => ({ key, kind: "artists" as const, r })),
  ]);
  const results = await Promise.all(calls);
  const rawTracks: Track[] = [];
  const rawArtists: Artist[] = [];
  const lists = { tracks: {}, artists: {}, fetchedAt: Date.now() } as TopLists;
  for (const { key, kind, r } of results) {
    if (kind === "tracks") {
      const items = (r.items as Track[]).filter((t) => t.id);
      rawTracks.push(...items);
      lists.tracks[key] = items.map(slimTrack);
    } else {
      const items = r.items as Artist[];
      rawArtists.push(...items);
      lists.artists[key] = items.map(slimArtist);
    }
  }
  return { lists, rawTracks, rawArtists };
}

const TOP_TTL_MS = 60 * 60 * 1000;
const cache = globalThis as typeof globalThis & { __rewindTop?: TopLists };

/** Top lists for pages, cached in memory for an hour per server instance. */
export async function getTopLists(): Promise<TopLists> {
  const hit = cache.__rewindTop;
  if (hit && Date.now() - hit.fetchedAt < TOP_TTL_MS) return hit;
  const { lists } = await fetchTopListsRaw();
  cache.__rewindTop = lists;
  return lists;
}

/** Insights from one set of rankings (by artist). */
export function insights(lists: TopLists) {
  const ids = (k: TimeRange) => new Set(lists.artists[k].map((a) => a.id));
  const short = ids("short_term");
  const medium = ids("medium_term");
  return {
    obsessions: lists.artists.short_term.filter((a) => !medium.has(a.id)),
    oldFaithfuls: lists.artists.long_term.filter((a) => short.has(a.id) && medium.has(a.id)),
    fading: lists.artists.long_term.filter((a) => !short.has(a.id)),
  };
}
