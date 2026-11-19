import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { BumpChart, type BumpSeries } from "@/components/charts/bump-chart";
import { Floater, IconBadge, LoadingTape, Note, Vinyl } from "@/components/decor";
import { FlameIcon, HeadphonesIcon, ShapesIcon } from "@/components/icons";
import { EmptyState, PageBody, PageHero, Section } from "@/components/page-hero";
import { Cover } from "@/components/cover";
import { SpotifyLink } from "@/components/spotify";
import { TopBoard, type Movement } from "@/components/top-board";
import { recentSnapshots, type SnapshotDoc } from "@/lib/snapshots";
import { getTopLists, insights, type TopArtist, type TopLists } from "@/lib/spotify/top";
import { RANGES } from "@/lib/spotify/types";
import { dayLabel, todayKey } from "@/lib/time";

export const metadata = { title: "Top · Rewind" };

export default function TopPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="Spotify's ranking"
        title="Your top lists"
        subtitle="What Spotify thinks you love right now, this season and all year."
        decor={
          <>
            <Floater className="right-[6%] top-24 w-24 sm:right-[12%] sm:w-40" variant="b">
              <div className="spin-slow"><Vinyl label="#7B4B94" /></div>
            </Floater>
            <Floater className="bottom-32 right-[36%] hidden w-12 sm:block" rotate={-10} delay={1}>
              <Note />
            </Floater>
          </>
        }
      />
      <Suspense fallback={<LoadingTape label="Asking Spotify for your rankings…" />}>
        <TopContent />
      </Suspense>
    </main>
  );
}

function movementFrom(lists: TopLists, prev: SnapshotDoc): Movement {
  const diff = (now: string[], before: string[]) => {
    const prevRank = new Map(before.map((id, i) => [id, i]));
    return Object.fromEntries(
      now.map((id, i) => {
        const p = prevRank.get(id);
        return [id, p === undefined ? ("new" as const) : p - i];
      }),
    );
  };
  return Object.fromEntries(
    RANGES.map(({ key }) => [
      key,
      {
        tracks: diff(lists.tracks[key].map((t) => t.id), prev.tracks[key] ?? []),
        artists: diff(lists.artists[key].map((a) => a.id), prev.artists[key] ?? []),
      },
    ]),
  ) as Movement;
}

function bumpData(snaps: SnapshotDoc[], lists: TopLists) {
  const asc = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
  const latest = asc.at(-1)!;
  const names = new Map<string, string>();
  for (const { key } of RANGES) for (const a of lists.artists[key]) names.set(a.id, a.name);
  const series: BumpSeries[] = (latest.artists.short_term ?? []).slice(0, 10).map((id) => ({
    id,
    name: names.get(id) ?? "Unknown artist",
    ranks: asc.map((s) => {
      const i = (s.artists.short_term ?? []).indexOf(id);
      return i === -1 ? null : i + 1;
    }),
  }));
  return { dates: asc.map((s) => s.date), series };
}

async function TopContent() {
  await connection();
  let lists: TopLists;
  try {
    lists = await getTopLists();
  } catch (err) {
    console.error("[top] Spotify request failed", err);
    return (
      <PageBody>
        <EmptyState title="Spotify didn't answer" icon={<Vinyl className="spin-slow w-16" />}>
          Couldn&apos;t load your rankings right now. Try again in a minute.
        </EmptyState>
      </PageBody>
    );
  }

  const snaps = await recentSnapshots(30);
  const prev = snaps.find((s) => s.date < todayKey()) ?? null;
  const movement = prev ? movementFrom(lists, prev) : null;
  const ins = insights(lists);

  return (
    <PageBody>
      <TopBoard lists={lists} movement={movement} since={prev ? dayLabel(prev.date) : null} />

      <Section title="What the rankings say">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          <InsightCard
            title="New obsessions"
            body="In your last 4 weeks, but not your last 6 months."
            artists={ins.obsessions}
            from="#E4572E"
            to="#D9667E"
            icon={<FlameIcon />}
            delay={0}
          />
          <InsightCard
            title="Old faithfuls"
            body="Top artists in all three ranges. Ride or die."
            artists={ins.oldFaithfuls}
            from="#7B4B94"
            to="#4A90C2"
            icon={<HeadphonesIcon />}
            delay={100}
          />
          <InsightCard
            title="Fading out"
            body="Big this year, missing from the last 4 weeks."
            artists={ins.fading}
            from="#2E7D7A"
            to="#8A9A3B"
            icon={<ShapesIcon />}
            delay={200}
          />
        </div>
      </Section>

      <Section title="Rank movement" description="Your top 10 artists of the last 4 weeks, one point per daily snapshot.">
        {snaps.length >= 2 ? (
            <div className="tile p-5 sm:p-6">
              <BumpChart {...bumpData(snaps, lists)} />
            </div>
          ) : (
            <EmptyState title="Comes alive in a few days" icon={<Vinyl className="spin-slow w-16" />}>
              Rewind takes one snapshot of your rankings a day. {snaps.length === 1 ? "The first one is in" : "None yet"}, so
              check back after a couple more to see artists climb and fall.
            </EmptyState>
          )}
      </Section>
    </PageBody>
  );
}

function InsightCard({
  title,
  body,
  artists,
  from,
  to,
  icon,
  delay,
}: {
  title: string;
  body: string;
  artists: TopArtist[];
  from: string;
  to: string;
  icon: ReactNode;
  delay: number;
}) {
  return (
    <article className="rise tile tile-hover flex flex-col p-5 sm:p-6" style={{ ["--d" as string]: `${delay}ms` }}>
      <IconBadge from={from} to={to}>{icon}</IconBadge>
      <h3 className="font-display mt-5 text-2xl font-bold">{title}</h3>
      <p className="mt-0.5 text-sm text-ink-soft">{body}</p>
      {artists.length ? (
        <ul className="mt-4 space-y-2">
          {artists.slice(0, 6).map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              <Cover src={a.image} round className="h-9 w-9" />
              <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>
              <SpotifyLink href={a.url} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">Nobody here right now.</p>
      )}
    </article>
  );
}
