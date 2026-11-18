/**
 * Extended Streaming History parsing. Pure and browser-safe: runs in the
 * /import page so only small, cleaned chunks are ever uploaded.
 *
 * Rules (confirmed in the blueprint): keep only music tracks, skip podcasts
 * and video, drop incognito plays, bucket days in Asia/Jakarta by the time
 * the play ended (`ts`), a stream is ≥ 30 s.
 */
import { artistKey } from "@/lib/plays/keys";
import { isStream, type Play } from "@/lib/plays/types";
import { mergeBinges, scanBinges } from "@/lib/stats/streaks";
import type { Binge } from "@/lib/stats/types";
import { dayKey } from "@/lib/time";

/** One row of Streaming_History_Audio_*.json (fields we read). IP/user-agent fields are ignored. */
export type ExportRow = {
  ts?: string;
  ms_played?: number;
  platform?: string | null;
  spotify_track_uri?: string | null;
  spotify_episode_uri?: string | null;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  reason_start?: string | null;
  reason_end?: string | null;
  shuffle?: boolean | null;
  skipped?: boolean | null;
  incognito_mode?: boolean | null;
};

export type TrackMeta = { name: string; artist: string; album?: string };

export type ParseReport = {
  files: number;
  rows: number;
  kept: number;
  skippedPodcastOrVideo: number;
  skippedIncognito: number;
  skippedNoMetadata: number;
  skippedLocalOrBad: number;
  hours: number;
  streams: number;
  uniqueTracks: number;
  uniqueArtists: number;
  firstDay: string | null;
  lastDay: string | null;
};

export type ParsedExport = {
  importId: string;
  cutoff: number; // latest ts in the files (UTC ms)
  days: { day: string; plays: Play[] }[]; // sorted by day
  tracks: Record<string, TrackMeta>;
  binges: Binge[];
  report: ParseReport;
};

/** Collapse Spotify's long platform strings into a few buckets. */
export function normalizePlatform(raw?: string | null): string {
  const p = (raw ?? "").toLowerCase();
  if (!p) return "Unknown";
  if (p.includes("android")) return p.includes("tv") ? "TV & cast" : "Android";
  if (p.includes("ios") || p.includes("iphone") || p.includes("ipad")) return "iOS";
  if (p.includes("windows")) return "Windows";
  if (p.includes("os x") || p.includes("osx") || p.includes("mac")) return "macOS";
  if (p.includes("linux")) return "Linux";
  if (p.includes("web") || p.includes("browser") || p.includes("chrome")) return "Web";
  if (p.includes("cast") || p.includes("sonos") || p.includes("speaker") || p.includes("tv") || p.includes("playstation") || p.includes("xbox"))
    return "TV & cast";
  if (p.includes("car") || p.includes("auto")) return "Car";
  return "Other";
}

const TRACK_URI = /^spotify:track:([A-Za-z0-9]{22})$/;

/** Turn every file's rows into cleaned plays grouped by day, plus a report. */
export function parseExport(files: ExportRow[][]): ParsedExport {
  const report: ParseReport = {
    files: files.length,
    rows: 0,
    kept: 0,
    skippedPodcastOrVideo: 0,
    skippedIncognito: 0,
    skippedNoMetadata: 0,
    skippedLocalOrBad: 0,
    hours: 0,
    streams: 0,
    uniqueTracks: 0,
    uniqueArtists: 0,
    firstDay: null,
    lastDay: null,
  };
  const plays: Play[] = [];
  const tracks: Record<string, TrackMeta> = {};
  const seen = new Set<string>(); // drop exact duplicate rows across overlapping files

  for (const rows of files) {
    for (const r of rows) {
      report.rows += 1;
      if (r.spotify_episode_uri) {
        report.skippedPodcastOrVideo += 1;
        continue;
      }
      if (r.incognito_mode) {
        report.skippedIncognito += 1;
        continue;
      }
      const m = TRACK_URI.exec(r.spotify_track_uri ?? "");
      const ts = r.ts ? Date.parse(r.ts) : NaN;
      if (!m || !Number.isFinite(ts) || typeof r.ms_played !== "number") {
        if (!r.spotify_track_uri && !r.spotify_episode_uri) report.skippedNoMetadata += 1;
        else report.skippedLocalOrBad += 1;
        continue;
      }
      if (!r.master_metadata_track_name || !r.master_metadata_album_artist_name) {
        report.skippedNoMetadata += 1;
        continue;
      }
      const trackId = m[1];
      const key = `${trackId}@${Math.round(ts / 1000)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      tracks[trackId] ??= {
        name: r.master_metadata_track_name,
        artist: r.master_metadata_album_artist_name,
        ...(r.master_metadata_album_album_name ? { album: r.master_metadata_album_album_name } : {}),
      };
      const p: Play = {
        ts,
        trackId,
        artistKey: artistKey(r.master_metadata_album_artist_name),
        msPlayed: Math.max(0, Math.round(r.ms_played)),
        src: "export",
        platform: normalizePlatform(r.platform),
        ...(r.skipped != null ? { skipped: !!r.skipped } : {}),
        ...(r.shuffle != null ? { shuffle: !!r.shuffle } : {}),
        ...(r.reason_start ? { reasonStart: r.reason_start } : {}),
        ...(r.reason_end ? { reasonEnd: r.reason_end } : {}),
      };
      plays.push(p);
    }
  }

  plays.sort((a, b) => a.ts - b.ts);
  const byDay = new Map<string, Play[]>();
  const artists = new Set<string>();
  let ms = 0;
  for (const p of plays) {
    const d = dayKey(p.ts);
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(p);
    artists.add(p.artistKey);
    ms += p.msPlayed;
    if (isStream(p)) report.streams += 1;
  }
  const days = [...byDay].map(([day, ps]) => ({ day, plays: ps })).sort((a, b) => a.day.localeCompare(b.day));

  report.kept = plays.length;
  report.hours = Math.round((ms / 3_600_000) * 10) / 10;
  report.uniqueTracks = Object.keys(tracks).length;
  report.uniqueArtists = artists.size;
  report.firstDay = days[0]?.day ?? null;
  report.lastDay = days.at(-1)?.day ?? null;

  const cutoff = plays.at(-1)?.ts ?? 0;
  const { found } = scanBinges(plays, null);
  return {
    importId: `exp-${cutoff}-${plays.length}`,
    cutoff,
    days,
    tracks,
    binges: mergeBinges([], found, 50),
    report,
  };
}

/** Split days into upload chunks that stay well under Vercel's ~4.5 MB request limit. */
export function chunkDays(days: { day: string; plays: Play[] }[], maxPlays = 2500, maxDays = 120) {
  const chunks: { day: string; plays: Play[] }[][] = [];
  let cur: { day: string; plays: Play[] }[] = [];
  let n = 0;
  for (const d of days) {
    if (cur.length && (n + d.plays.length > maxPlays || cur.length >= maxDays)) {
      chunks.push(cur);
      cur = [];
      n = 0;
    }
    cur.push(d);
    n += d.plays.length;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}
