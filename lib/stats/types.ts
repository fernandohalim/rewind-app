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
  rolledUpAt: number;
};
