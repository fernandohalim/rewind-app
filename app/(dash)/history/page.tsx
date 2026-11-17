import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { MonthBars } from "@/components/charts/month-bars";
import { Cassette, Floater, LoadingTape } from "@/components/decor";
import { EmptyState, PageHero, SectionTitle } from "@/components/page-hero";
import { CountTile } from "@/components/entity-parts";
import { RankList } from "@/components/rank-list";
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
      <div className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 pb-16">
        <EmptyState title="The tape is still blank" icon={<Cassette className="w-24" />}>
          Plays are being logged every half hour. Your history appears after the first nightly rollup.
        </EmptyState>
      </div>
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
    <div className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 pb-20">
      {/* Picker */}
      <div className="tile relative p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Chip href={href({ by: by === "ms" ? "ms" : undefined })} active={!year}>All time</Chip>
          {allTime.years.map((y) => (
            <Chip key={y} href={href({ y, by: by === "ms" ? "ms" : undefined })} active={year === y && !month}>
              {y}
            </Chip>
          ))}
        </div>
        {year && monthsOfYear.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
            {monthsOfYear.map((m) => (
              <Chip key={m.month} small href={href({ y: year, m: m.month, by: by === "ms" ? "ms" : undefined })} active={month === m.month}>
                {monthLabel(m.month, false)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {!summary ? (
        <div className="mt-8">
          <EmptyState title="Nothing on this stretch of tape">No plays were logged for {scopeLabel}.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CountTile key={`h-${scopeLabel}`} label={`Hours · ${scopeLabel}`} value={Math.round(hours(summary.totals.ms) * 10) / 10} decimals={1} unit="h" />
            <CountTile key={`s-${scopeLabel}`} label="Streams" value={summary.totals.count} delay={60} />
            <CountTile key={`t-${scopeLabel}`} label="Unique tracks" value={summary.uniqueTracks} delay={120} />
            <CountTile key={`a-${scopeLabel}`} label="Unique artists" value={summary.uniqueArtists} delay={180} />
          </div>

          {!month && barsSource.length > 0 && (
            <section className="mt-12">
              <SectionTitle>Hours by month</SectionTitle>
              <div className="tile mt-6 p-5 sm:p-7">
                <MonthBars
                  bars={barsSource.map((m) => ({
                    key: m.month,
                    label: year ? monthLabel(m.month, false) : `${monthLabel(m.month, false)} ${m.month.slice(2, 4)}`,
                    value: hours(m.ms),
                    detail: monthLabel(m.month),
                  }))}
                />
              </div>
            </section>
          )}

          <section className="mt-12">
            <SectionTitle
              aside={
                <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-ink/5">
                  <Toggle href={href({ y: year, m: month })} active={by === "count"}>By plays</Toggle>
                  <Toggle href={href({ y: year, m: month, by: "ms" })} active={by === "ms"}>By minutes</Toggle>
                </div>
              }
            >
              Most played
            </SectionTitle>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <RankList title="Tracks" rows={named.tracks} by={by} />
              <RankList title="Artists" rows={named.artists} by={by} round />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Chip({ href, active, children, small }: { href: string; active: boolean; children: ReactNode; small?: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-full font-semibold transition ${small ? "px-3 py-1 text-sm" : "px-4 py-2"} ${
        active ? "bg-vermilion text-ink shadow" : "bg-paper-deep text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function Toggle({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${active ? "bg-plum text-white shadow" : "text-ink-soft hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}
