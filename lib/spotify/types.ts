import { z } from "zod";

export const SCOPES = ["user-top-read", "user-read-recently-played"] as const;

export const TokenResponse = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(), // omitted on refresh unless Spotify rotates it
  scope: z.string().optional(),
});
export type TokenResponse = z.infer<typeof TokenResponse>;

const Image = z.object({ url: z.string(), width: z.number().nullish(), height: z.number().nullish() });

export const Me = z.object({
  id: z.string(),
  display_name: z.string().nullish(),
  images: z.array(Image).optional(),
});
export type Me = z.infer<typeof Me>;

export const Artist = z.object({
  id: z.string(),
  name: z.string(),
  images: z.array(Image).optional(),
  external_urls: z.object({ spotify: z.string() }).partial().optional(),
});
export type Artist = z.infer<typeof Artist>;

export const TopArtists = z.object({ items: z.array(Artist) });

const SimpleArtist = z.object({ id: z.string().nullish(), name: z.string() });

export const Track = z.object({
  id: z.string().nullish(), // null for local files
  name: z.string(),
  duration_ms: z.number(),
  artists: z.array(SimpleArtist),
  album: z
    .object({
      name: z.string().optional(),
      images: z.array(Image).optional(),
      release_date: z.string().nullish(),
    })
    .optional(),
  external_ids: z.object({ isrc: z.string().optional() }).partial().optional(),
  external_urls: z.object({ spotify: z.string() }).partial().optional(),
  type: z.string().optional(),
});
export type Track = z.infer<typeof Track>;

export const TopTracks = z.object({ items: z.array(Track) });

export const RecentlyPlayed = z.object({
  items: z.array(z.object({ played_at: z.string(), track: Track })),
});

export type TimeRange = "short_term" | "medium_term" | "long_term";
export const RANGES: { key: TimeRange; label: string; short: string }[] = [
  { key: "short_term", label: "Last 4 weeks", short: "4 weeks" },
  { key: "medium_term", label: "Last 6 months", short: "6 months" },
  { key: "long_term", label: "Last year", short: "1 year" },
];

/** Shape of the `config/spotify` document. */
export type SpotifyConfig = {
  spotifyId: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: number; // ms since epoch
  scope?: string;
  refreshingUntil?: number; // short lease so only one job refreshes at a time
  pollCursor?: number; // ms of the newest played_at already stored
  lastPollAt?: number;
  exportCutoff?: number;
  connectedAt?: number;
};
