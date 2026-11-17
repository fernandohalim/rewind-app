/**
 * One artist key for both sources (the export has no artist ids, only names).
 * NFKC-normalized, lowercased, trimmed, spaces collapsed. "/" is replaced
 * because Firestore doc ids can't contain it. Two artists with the same name
 * merge; that's accepted (see blueprint).
 */
export function artistKey(name: string | null | undefined): string {
  const k = (name ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\//g, "∕");
  if (!k || k === "." || k === ".." || /^__.*__$/.test(k)) return `artist:${k || "unknown"}`;
  return k.slice(0, 300);
}

/** A play's identity: track id + end time rounded to the second. */
export const playId = (p: { trackId: string; ts: number }) =>
  `${p.trackId}@${Math.round(p.ts / 1000)}`;
