/** A play counts as a stream for top lists from this many ms. Shorter plays only feed skip stats. */
export const STREAM_MIN_MS = 30_000;

export type Play = {
  ts: number; // UTC ms when the play ended
  trackId: string;
  artistKey: string;
  msPlayed: number;
  msEst?: boolean; // msPlayed estimated from gaps (API plays)
  skipped?: boolean | "est";
  reasonEnd?: string;
  shuffle?: boolean;
  platform?: string;
  src: "api" | "export";
};

export type DayDoc = {
  day: string;
  items: Play[];
  count: number;
  msTotal: number;
};

export type DayTotals = { count: number; ms: number };

/** `stats/month-YYYY-MM`. Counts are streams (≥ STREAM_MIN_MS); ms include every play. */
export type MonthDoc = {
  month: string;
  trackCount: Record<string, number>;
  trackMs: Record<string, number>;
  artistCount: Record<string, number>;
  artistMs: Record<string, number>;
  heat: Record<string, number>; // "dow_hour" -> streams
  days: Record<string, DayTotals>;
  skips: Record<string, number>; // artistKey -> skipped plays
  totals: { count: number; ms: number; plays: number; skips: number };
};

export const isStream = (p: Play) => p.msPlayed >= STREAM_MIN_MS;
