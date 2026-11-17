import { FieldValue, type WriteBatch } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import { artistKey } from "@/lib/plays/keys";
import type { Artist, Track } from "@/lib/spotify/types";

/** `tracks/{trackId}` */
export type TrackDoc = {
  name: string;
  artistKey: string;
  artistName: string;
  artists: { id: string | null; name: string }[];
  album?: { name?: string; image?: string };
  durationMs: number;
  isrc?: string;
  releaseDate?: string;
  url?: string;
  metaSource: "api" | "export-stub";
};

/** `artists/{artistKey}` */
export type ArtistDoc = {
  name: string;
  spotifyId?: string;
  image?: string;
  url?: string;
  mbid?: string | null; // null = looked for and not found
  tags?: { name: string; weight: number; src: string }[];
  genres?: string[]; // merged top 5
  similar?: { name: string; match: number; mbid?: string; url?: string }[];
  enrichedAt?: number;
  nextEnrichAt?: number;
};

const pickImage = (imgs?: { url: string; width?: number | null }[]) =>
  imgs?.find((i) => (i.width ?? 0) >= 160 && (i.width ?? 0) <= 400)?.url ?? imgs?.[0]?.url;

export function trackDocFrom(t: Track): TrackDoc | null {
  if (!t.id) return null;
  const primary = t.artists[0]?.name ?? "Unknown artist";
  return {
    name: t.name,
    artistKey: artistKey(primary),
    artistName: primary,
    artists: t.artists.map((a) => ({ id: a.id ?? null, name: a.name })),
    album: { name: t.album?.name, image: pickImage(t.album?.images) },
    durationMs: t.duration_ms,
    isrc: t.external_ids?.isrc,
    releaseDate: t.album?.release_date ?? undefined,
    url: t.external_urls?.spotify,
    metaSource: "api",
  };
}

/** Queue upserts for tracks and their primary artists (from track objects). */
export function upsertTracks(batch: WriteBatch, tracks: Track[]) {
  const db = getDb();
  const seen = new Set<string>();
  for (const t of tracks) {
    const doc = trackDocFrom(t);
    if (!doc || seen.has(t.id!)) continue;
    seen.add(t.id!);
    batch.set(db.doc(`tracks/${t.id}`), { ...doc, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const primary = t.artists[0];
    batch.set(
      db.doc(`artists/${doc.artistKey}`),
      { name: doc.artistName, ...(primary?.id ? { spotifyId: primary.id } : {}) },
      { merge: true },
    );
  }
}

/** Queue upserts for full artist objects (top artists carry images). */
export function upsertArtists(batch: WriteBatch, artists: Artist[]) {
  const db = getDb();
  const seen = new Set<string>();
  for (const a of artists) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    batch.set(
      db.doc(`artists/${artistKey(a.name)}`),
      {
        name: a.name,
        spotifyId: a.id,
        image: pickImage(a.images),
        url: a.external_urls?.spotify,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

/** Read many entity docs at once (missing ids map to undefined). */
export async function getEntities<T>(collection: "tracks" | "artists", ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  const out = new Map<string, T>();
  if (!unique.length) return out;
  const db = getDb();
  for (let i = 0; i < unique.length; i += 100) {
    const refs = unique.slice(i, i + 100).map((id) => db.doc(`${collection}/${id}`));
    const snaps = await db.getAll(...refs);
    snaps.forEach((s) => s.exists && out.set(s.id, s.data() as T));
  }
  return out;
}
