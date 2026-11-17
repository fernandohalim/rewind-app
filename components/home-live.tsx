import Link from "next/link";
import { connection } from "next/server";
import type { JobStatus } from "@/lib/cron";
import { artistKey } from "@/lib/plays/keys";
import { vtName } from "@/lib/vt";
import { CountUp } from "./count-up";
import { Cover } from "./cover";
import type { ReactNode } from "react";
import { getEntities, type TrackDoc } from "@/lib/entities";
import { getDb } from "@/lib/firebase/admin";
import { isStream, type DayDoc } from "@/lib/plays/types";
import { spotifyGet } from "@/lib/spotify/client";
import { getTopLists } from "@/lib/spotify/top";
import { Me, TopArtists, type Artist } from "@/lib/spotify/types";
import { fmtHours, getAllTime, recentDays, weekAndStreak } from "@/lib/stats/read";
import { todayKey } from "@/lib/time";
import { IconBadge, Vinyl } from "./decor";
import { ClockIcon, FlameIcon, HeadphonesIcon } from "./icons";
import { SpotifyLink } from "./spotify";

/* Live bits on Home. Each one fails soft, so a hiccup never breaks the page. */

async function safely<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    console.error(`[home] ${label} failed`, err);
    return null;
  }
}

export async function HelloName() {
  await connection(); // per-request data: never prerender
  const me = await safely("/me", () => spotifyGet("/me", Me));
  const first = (me?.display_name ?? "").split(" ")[0];
  if (!me) return <>Hey, you&apos;re in.</>;
  return <>Hey{first ? `, ${first}` : ""}!</>;
}

function Tile({
  label,
  badge,
  from,
  to,
  icon,
  delay,
  children,
}: {
  label: string;
  badge: string;
  from: string;
  to: string;
  icon: ReactNode;
  delay: number;
  children: ReactNode;
}) {
  return (
    <article className="rise tile tile-hover relative p-6" style={{ ["--d" as string]: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <IconBadge from={from} to={to}>{icon}</IconBadge>
        <span className="wiggle-hover rounded-full bg-[#BFE3DF] px-2.5 py-1 text-xs font-bold text-ink" style={{ rotate: "-3deg" }}>
          {badge}
        </span>
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      {children}
    </article>
  );
}

/** Hours this week vs last, top artist, current streak. */
export async function HomeTiles() {
  await connection();
  const [days, allTime, top] = await Promise.all([
    safely("recent days", () => recentDays(14)),
    safely("all-time", () => getAllTime()),
    safely("top artists", () => spotifyGet("/me/top/artists?time_range=short_term&limit=1", TopArtists)),
  ]);
  const ws = days ? weekAndStreak(days, allTime) : null;
  const diff = ws ? ws.thisWeekMs - ws.lastWeekSameSpanMs : 0;

  return (
    <>
      <Tile label="Hours this week" badge="● live" from="#E4572E" to="#D9667E" icon={<ClockIcon />} delay={260}>
        <p className="font-display tabular mt-1 text-5xl font-bold">
          {ws ? <CountUp value={Math.round((ws.thisWeekMs / 3_600_000) * 10) / 10} decimals={1} /> : "–"}
          <span className="ml-1 text-2xl text-ink-soft">h</span>
        </p>
        {ws && ws.thisWeekMs === 0 && ws.lastWeekSameSpanMs === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">Quiet week so far. Press play.</p>
        ) : ws && (
          <p className={`mt-1 text-sm font-semibold ${diff >= 0 ? "text-teal-deep" : "text-vermilion-deep"}`}>
            {diff >= 0 ? "▲" : "▼"} {fmtHours(Math.abs(diff))} h vs this point last week
          </p>
        )}
      </Tile>
      <Tile label="Top artist, 4 weeks" badge="● live" from="#7B4B94" to="#4A90C2" icon={<HeadphonesIcon />} delay={370}>
        {top?.items[0] ? <ArtistLine artist={top.items[0]} /> : <p className="mt-2 text-sm text-ink-soft">Couldn&apos;t reach Spotify right now.</p>}
      </Tile>
      <Tile label="Day streak" badge="● live" from="#E9B44C" to="#E4572E" icon={<FlameIcon />} delay={480}>
        <p className="font-display tabular mt-1 text-5xl font-bold">
          <CountUp value={ws?.streak ?? 0} />
          <span className="ml-1 text-2xl text-ink-soft">{ws?.streak === 1 ? "day" : "days"}</span>
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {ws && ws.streak >= 7 ? "On fire. Don't break the tape." : "Days in a row with a stream."}
        </p>
      </Tile>
    </>
  );
}

function ArtistLine({ artist }: { artist: Artist }) {
  const img = artist.images?.at(-1)?.url;
  return (
    <div className="mt-2 flex items-center gap-3">
      <Link href={`/artist/${encodeURIComponent(artistKey(artist.name))}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
        <Cover src={img} vt={vtName("artist", artistKey(artist.name))} round className="h-12 w-12 shadow ring-2 ring-white" />
        <span className="font-display min-w-0 flex-1 truncate text-3xl font-bold leading-tight">{artist.name}</span>
      </Link>
      <SpotifyLink href={artist.external_urls?.spotify} />
    </div>
  );
}

export function TilesSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="tile h-[212px] animate-pulse p-6">
          <div className="h-16 w-16 rounded-full bg-paper-deep" />
          <div className="mt-6 h-4 w-32 rounded-full bg-paper-deep" />
          <div className="mt-3 h-10 w-24 rounded-full bg-paper-deep" />
        </div>
      ))}
    </>
  );
}

/** Spotify's current top 5 tracks (4 weeks). */
export async function NowTop5() {
  await connection();
  const lists = await safely("top lists", () => getTopLists());
  const tracks = lists?.tracks.short_term.slice(0, 5) ?? [];
  if (!tracks.length) return <p className="text-ink-soft">Couldn&apos;t reach Spotify right now.</p>;
  return (
    <ol className="grid gap-3 sm:grid-cols-5">
      {tracks.map((t, i) => (
        <li key={t.id} className="rise tile tile-hover group relative overflow-hidden p-3" style={{ ["--d" as string]: `${i * 70}ms` }}>
          <Link href={`/track/${t.id}`} className="relative block">
            <Cover src={t.image} vt={vtName("track", t.id)} className="aspect-square w-full !rounded-2xl shadow transition-transform duration-500 group-hover:rotate-[-3deg] group-hover:scale-[1.03]" />
            <span className="font-display absolute -left-1 -top-1 grid h-10 w-10 place-items-center rounded-full bg-vermilion text-xl font-bold text-ink shadow">
              {i + 1}
            </span>
          </Link>
          <div className="mt-3 flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t.name}</p>
              <p className="truncate text-sm text-ink-soft">{t.artists}</p>
            </div>
            <SpotifyLink href={t.url} />
          </div>
        </li>
      ))}
    </ol>
  );
}

const JOBS: { key: string; label: string; every: string; staleAfterMs: number }[] = [
  { key: "poll", label: "Play logger", every: "every 30 min", staleAfterMs: 2 * 60 * 60 * 1000 },
  { key: "enrich", label: "Genre finder", every: "daily", staleAfterMs: 30 * 60 * 60 * 1000 },
  { key: "snapshot", label: "Daily snapshot", every: "daily", staleAfterMs: 30 * 60 * 60 * 1000 },
  { key: "rollup", label: "Nightly rollup", every: "nightly", staleAfterMs: 30 * 60 * 60 * 1000 },
];

const ago = (ms: number) => {
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

async function loadJobStatus() {
  const status = await safely(
    "job status",
    async () => (await getDb().doc("config/jobs").get()).data() as Record<string, JobStatus> | undefined,
  );
  return { status, now: Date.now() };
}

/** Behind the scenes: when each background job last ran, and whether it worked. */
export async function JobsStatus() {
  await connection();
  const { status, now } = await loadJobStatus();
  return (
    <ul className="grid gap-3 sm:grid-cols-4">
      {JOBS.map((j) => {
        const s = status?.[j.key];
        const state = !s ? "never" : !s.ok ? "failed" : now - s.at > j.staleAfterMs ? "late" : "ok";
        const dot = { ok: "bg-teal", late: "bg-mustard", failed: "bg-vermilion", never: "bg-ink/20" }[state];
        return (
          <li key={j.key} className="tile flex items-start gap-3 p-4">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot} ${state === "ok" ? "twinkle" : ""}`} aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{j.label}</p>
              <p className="text-xs text-ink-soft">
                {state === "never" && `Hasn't run yet · ${j.every}`}
                {state === "ok" && `Ran ${ago(now - s!.at)} · ${j.every}`}
                {state === "late" && `Last ran ${ago(now - s!.at)}. Is the schedule on?`}
                {state === "failed" && (
                  <span title={s!.error}>Failed {ago(now - s!.at)}{s!.lastOkAt ? ` · last OK ${ago(now - s!.lastOkAt)}` : ""}</span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** For each earlier year with data: the most-played track on today's date. */
export async function ThisDayYearsAgo() {
  await connection();
  const result = await safely("this day", async () => {
    const allTime = await getAllTime();
    const today = todayKey();
    const mmdd = today.slice(5);
    const years = (allTime?.years ?? []).filter((y) => y < today.slice(0, 4));
    if (!years.length) return [];
    const db = getDb();
    const snaps = await db.getAll(...years.map((y) => db.doc(`plays/${y}-${mmdd}`)));
    const picks = snaps.flatMap((s) => {
      const items = ((s.data() as DayDoc | undefined)?.items ?? []).filter(isStream);
      if (!items.length) return [];
      const counts = new Map<string, number>();
      for (const p of items) counts.set(p.trackId, (counts.get(p.trackId) ?? 0) + 1);
      const [trackId, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
      return [{ year: s.id.slice(0, 4), trackId, count }];
    });
    const tracks = await getEntities<TrackDoc>("tracks", picks.map((p) => p.trackId));
    return picks.map((p) => ({ ...p, track: tracks.get(p.trackId) })).reverse();
  });

  if (!result?.length) {
    return (
      <div className="tile flex items-center gap-5 p-6">
        <Vinyl className="spin-slow w-16 shrink-0" />
        <p className="text-ink-soft">
          Nothing from past years yet. Once your full Spotify history is imported, this is where you&apos;ll see what you
          played on this day, years ago.
        </p>
      </div>
    );
  }
  const thisYear = Number(todayKey().slice(0, 4));
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {result.map((r) => (
        <li key={r.year} className="rise tile tile-hover flex items-center gap-3 p-4">
          {r.track?.album?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.track.album.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <span className="h-14 w-14 rounded-xl bg-paper-deep" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-vermilion-deep">
              {thisYear - Number(r.year)} {thisYear - Number(r.year) === 1 ? "year" : "years"} ago
            </p>
            <p className="truncate font-semibold">{r.track?.name ?? "Unknown track"}</p>
            <p className="truncate text-sm text-ink-soft">
              {r.track?.artistName} · {r.count}×
            </p>
          </div>
          <SpotifyLink href={r.track?.url} />
        </li>
      ))}
    </ul>
  );
}
