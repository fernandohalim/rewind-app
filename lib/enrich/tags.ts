/**
 * Tag normalization: lowercase, merge synonyms, drop junk (opinions, years,
 * nationalities, "seen live"), then merge sources into weighted genres.
 */

const SYNONYMS: Record<string, string> = {
  "hip hop": "hip-hop",
  hiphop: "hip-hop",
  rap: "hip-hop",
  "rnb": "r&b",
  "r and b": "r&b",
  "r'n'b": "r&b",
  "rhythm and blues": "r&b",
  "contemporary r&b": "r&b",
  electronica: "electronic",
  "electronic music": "electronic",
  "edm": "edm",
  "kpop": "k-pop",
  "k pop": "k-pop",
  "korean pop": "k-pop",
  "jpop": "j-pop",
  "j pop": "j-pop",
  "dnb": "drum and bass",
  "drum n bass": "drum and bass",
  "drum & bass": "drum and bass",
  "d&b": "drum and bass",
  "alt": "alternative",
  "alternative rock": "alt rock",
  "alt-rock": "alt rock",
  "indie-pop": "indie pop",
  "synth pop": "synthpop",
  "synth-pop": "synthpop",
  "lo fi": "lo-fi",
  "lofi": "lo-fi",
  "contemporary christian": "christian",
  "ccm": "christian",
  "christian music": "christian",
  "worship music": "worship",
  "praise & worship": "worship",
  "praise and worship": "worship",
  "soundtracks": "soundtrack",
  "ost": "soundtrack",
  "dubstep": "dubstep",
  "house music": "house",
  "trap music": "trap",
  "singer songwriter": "singer-songwriter",
};

const JUNK = new Set([
  "seen live", "favorites", "favourites", "favorite", "favourite", "love", "loved", "awesome", "beautiful",
  "cool", "amazing", "best", "good", "great", "my favorite", "spotify", "under 2000 listeners", "all",
  "female vocalists", "male vocalists", "female vocalist", "male vocalist", "vocalists", "music", "other",
  "american", "british", "english", "uk", "usa", "us", "indonesian", "indonesia", "korean", "korea", "japanese",
  "japan", "canadian", "australian", "german", "french", "swedish", "dutch", "norwegian", "irish", "scottish",
  "brazilian", "spanish", "italian", "chinese", "taiwanese", "filipino", "malaysian", "thai", "mexican",
  "new zealand", "latin american", "african", "nigerian", "south african",
]);

export function normalizeTag(raw: string, artistName?: string): string | null {
  let t = raw.toLowerCase().normalize("NFKC").trim().replace(/[_]+/g, " ").replace(/\s+/g, " ");
  if (!t || t.length > 40) return null;
  if (/^\d{2,4}s?$/.test(t) || /^\d{4}$/.test(t)) return null; // years and decades
  if (/^(seen|saw) /.test(t)) return null;
  if (artistName && t === artistName.toLowerCase().trim()) return null;
  t = SYNONYMS[t] ?? t;
  if (JUNK.has(t)) return null;
  return t;
}

export type WeightedTag = { name: string; weight: number; src: "mb-genre" | "mb-tag" | "lastfm" };

/** Scale counts to 0..1 within one source and normalize names. */
export function weigh(
  items: { name: string; count: number }[],
  src: WeightedTag["src"],
  artistName?: string,
  factor = 1,
): WeightedTag[] {
  const max = Math.max(1, ...items.map((i) => i.count));
  const out = new Map<string, number>();
  for (const i of items) {
    const name = normalizeTag(i.name, artistName);
    if (!name || i.count <= 0) continue;
    const w = (i.count / max) * factor;
    out.set(name, Math.max(out.get(name) ?? 0, w));
  }
  return [...out].map(([name, weight]) => ({ name, weight: Math.round(weight * 1000) / 1000, src }));
}

/** Merge per-source weights into the top 5 genres (score ≥ 0.15 of the best). */
export function mergeGenres(tags: WeightedTag[], n = 5): string[] {
  const score = new Map<string, number>();
  for (const t of tags) score.set(t.name, (score.get(t.name) ?? 0) + t.weight);
  const ranked = [...score].sort((a, b) => b[1] - a[1]);
  const best = ranked[0]?.[1] ?? 0;
  return ranked.filter(([, s]) => s >= best * 0.15).slice(0, n).map(([name]) => name);
}
