import type { Habits } from "@/lib/plays/types";
import type { SkipArtist, SkipMonth } from "./habits";
import type { Discovery, Diversity, Era, GenreMonth, SeriesEntry } from "./taste";

/** Ranked entry: id is a trackId or artistKey. */
export type Ranked = { id: string; count: number; ms: number };

export type Streak = { start: string; end: string; days: number };

export type Binge = { trackId: string; count: number; start: number; end: number };

/** `stats/year-YYYY` */
export type YearDoc = {
  year: string;
  totals: { count: number; ms: number; plays: number; skips: number };
  uniqueTracks: number;
  uniqueArtists: number;
  topTracks: Ranked[]; // by count, top 200
  topArtists: Ranked[];
  topTracksByMs: Ranked[];
  topArtistsByMs: Ranked[];
  months: { month: string; count: number; ms: number }[];
};

/** `stats/all-time` */
export type AllTimeDoc = YearDoc & {
  years: string[];
  heat: Record<string, number>; // "dow_hour" -> streams
  firstMonth: Record<string, string>; // artistKey -> first month heard
  newArtistsByMonth: Record<string, number>;
  streaks: { longest: Streak[]; current: Streak | null };
  binges: Binge[];
  bingeScan?: { lastDay: string; carry: Binge | null };
  // Level 5 (taste)
  topGenres: string[]; // ≤ 5, fixed colour order
  genreMonths: GenreMonth[];
  eras: Era[];
  diversity: Diversity[];
  discovery: Discovery[];
  recentDiscoveries: { key: string; count: number; firstMonth: string }[];
  tagCoverage: number; // share of all minutes from artists with genres
  // Level 3 (habits, mostly from the export)
  habits?: Habits;
  skipByMonth?: SkipMonth[];
  mostSkipped?: SkipArtist[];
  neverSkipped?: SkipArtist[];
  rolledUpAt: number;
};

/** `stats/series-artists` and `stats/series-tracks`: timelines for the top entities. */
export type SeriesDoc = { entries: Record<string, SeriesEntry>; builtAt: number };
