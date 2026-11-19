import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { MonthBars } from "@/components/charts/month-bars";
import { Cassette, Floater, LoadingTape } from "@/components/decor";
import { EmptyState, PageBody, PageHero, Section } from "@/components/page-hero";
import { CountTile, StatGrid } from "@/components/entity-parts";
import { chip, segGroup, segItem } from "@/components/segmented";
import { RankList } from "@/components/rank-list";
import { ScrollRow } from "@/components/scroll-row";
import { getAllTime, getMonth, getYear, hours, monthAsSummary, nameRows } from "@/lib/stats/read";
import type { YearDoc } from "@/lib/stats/types";
import { monthLabel } from "@/lib/time";

export const metadata = { title: "History · Rewind" };

type Search = Promise<{ y?: string; m?: string; by?: string }>;

export default function HistoryPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="Counted by Rewind"
        title="Rewind the tape"
        subtitle="Pick a year or a month and see what you actually played, play by play."
        decor={
          <Floater className="right-[6%] top-24 w-28 sm:right-[12%] sm:w-44" rotate={-8}>
            <Cassette />
          </Floater>
        }
      />
      <Suspense fallback={<LoadingTape />}>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const valid = (s: string | undefined, re: RegExp) => (s && re.test(s) ? s : undefined);

async function HistoryContent({ searchParams }: { searchParams: Search }) {
  await connection();
  const sp = await searchParams;
  const year = valid(sp.y, /^\d{4}$/);
  const month = year ? valid(sp.m, /^\d{4}-\d{2}$/) : undefined;
  const by: "count" | "ms" = sp.by === "ms" ? "ms" : "count";

  const allTime = await getAllTime();
  if (!allTime) {
    return (
      <PageBody>
        <EmptyState title="The tape is still blank" icon={<Cassette className="w-24" />}>
          Plays are being logged every half hour. Your history appears after the first nightly rollup.
        </EmptyState>
      </PageBody>
    );
  }

  let summary: YearDoc | null;
  if (month) {
    const m = await getMonth(month);
    summary = m ? monthAsSummary(m) : null;
  } else if (year) {
    summary = await getYear(year);
  } else {
    summary = allTime;
  }

  const scopeLabel = month ? monthLabel(month) : year ?? "All time";
  const href = (q: Record<string, string | undefined>) => {
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
    const s = params.toString();
    return s ? `/history?${s}` : "/history";
  };
  const monthsOfYear = year ? allTime.months.filter((m) => m.month.startsWith(year)) : [];

  const tracks = summary ? (by === "count" ? summary.topTracks : summary.topTracksByMs).slice(0, 20) : [];
  const artists = summary ? (by === "count" ? summary.topArtists : summary.topArtistsByMs).slice(0, 20) : [];
  const named = await nameRows(tracks, artists);

  const barsSource = year ? monthsOfYear : allTime.months;

  return (
    <PageBody>
      {/* Picker: one scrolling row on phones, wraps from sm up. */}
      <div className="tile relative p-3 sm:p-4">
        <ScrollRow watch={year ?? "all"} className="fade-r -mx-1 flex gap-2 px-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]">
          <Chip href={href({ by: by === "ms" ? "ms" : undefined })} active={!year}>All time</Chip>
          {allTime.years.map((y) => (
            <Chip key={y} href={href({ y, by: by === "ms" ? "ms" : undefined })} active={year === y && !month}>
              {y}
            </Chip>
          ))}
        </ScrollRow>
        {year && monthsOfYear.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-ink/10 pt-3 min-[420px]:grid-cols-6 sm:flex sm:flex-wrap">
            {monthsOfYear.map((m) => (
              <Chip key={m.month} small href={href({ y: year, m: m.month, by: by === "ms" ? "ms" : undefined })} active={month === m.month}>
                {monthLabel(m.month, false)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {!summary ? (
        <div className="mt-6">
          <EmptyState title="Nothing on this stretch of tape" icon={<Cassette className="w-20" />}>No plays were logged for {scopeLabel}.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-6">
          <StatGrid>
            <CountTile key={`h-${scopeLabel}`} label={`Hours · ${scopeLabel}`} value={Math.round(hours(summary.totals.ms) * 10) / 10} decimals={1} unit="h" />
            <CountTile key={`s-${scopeLabel}`} label="Streams" value={summary.totals.count} delay={60} />
            <CountTile key={`t-${scopeLabel}`} label="Unique tracks" value={summary.uniqueTracks} delay={120} />
            <CountTile key={`a-${scopeLabel}`} label="Unique artists" value={summary.uniqueArtists} delay={180} />
          </StatGrid>
          </div>

          {!month && barsSource.length > 0 && (
            <Section title="Hours by month">
              <div className="tile p-5 sm:p-6">
                <MonthBars
                  bars={barsSource.map((m) => ({
                    key: m.month,
                    label: year ? monthLabel(m.month, false) : `${monthLabel(m.month, false)} ${m.month.slice(2, 4)}`,
                    value: hours(m.ms),
                    detail: monthLabel(m.month),
                  }))}
                />
              </div>
            </Section>
          )}

          <Section
            title="Most played"
            aside={
              <div className={`${segGroup} bg-white shadow-sm ring-1 ring-ink/5`}>
                <Toggle href={href({ y: year, m: month })} active={by === "count"}>By plays</Toggle>
                <Toggle href={href({ y: year, m: month, by: "ms" })} active={by === "ms"}>By minutes</Toggle>
              </div>
            }
          >
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <RankList title="Tracks" rows={named.tracks} by={by} />
              <RankList title="Artists" rows={named.artists} by={by} round />
            </div>
          </Section>
        </>
      )}
    </PageBody>
  );
}

function Chip({ href, active, children, small }: { href: string; active: boolean; children: ReactNode; small?: boolean }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? "page" : undefined} className={`${chip(active, small)} text-center`}>
      {children}
    </Link>
  );
}

function Toggle({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? "page" : undefined} className={segItem(active)}>
      {children}
    </Link>
  );
}
