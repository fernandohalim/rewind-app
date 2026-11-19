import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Heatmap } from "@/components/charts/heatmap";
import { MonthBars } from "@/components/charts/month-bars";
import { Floater, Headphones, IconBadge, LoadingTape, Note } from "@/components/decor";
import { ClockIcon, FlameIcon } from "@/components/icons";
import { CardHeader, EmptyState, PageBody, PageHero, Section } from "@/components/page-hero";
import { Cover } from "@/components/cover";
import { SpotifyLink } from "@/components/spotify";
import { getEntities, type TrackDoc } from "@/lib/entities";
import { getAllTime, hours } from "@/lib/stats/read";
import { dayKey, dayLabel, monthLabel } from "@/lib/time";

export const metadata = { title: "Time · Rewind" };

export default function TimePage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="When you listen"
        title="Your listening clock"
        subtitle="The hours you press play, the streaks you keep, and the songs you can't stop repeating."
        decor={
          <>
            <Floater className="right-[6%] top-24 w-24 sm:right-[12%] sm:w-36" rotate={8} variant="b">
              <Headphones />
            </Floater>
            <Floater className="bottom-32 right-[38%] hidden w-10 sm:block" rotate={12} delay={1.2}>
              <Note fill="#2E7D7A" />
            </Floater>
          </>
        }
      />
      <Suspense fallback={<LoadingTape />}>
        <TimeContent />
      </Suspense>
    </main>
  );
}

async function TimeContent() {
  await connection();
  const allTime = await getAllTime();
  if (!allTime) {
    return (
      <PageBody>
        <EmptyState title="The clock hasn't started" icon={<Headphones className="w-20" />}>
          Your listening clock fills in after the first nightly rollup.
        </EmptyState>
      </PageBody>
    );
  }

  const binges = allTime.binges ?? [];
  const tracks = await getEntities<TrackDoc>("tracks", binges.map((b) => b.trackId));
  const { longest, current } = allTime.streaks;

  return (
    <PageBody>
      <section className="tile relative p-5 sm:p-6">
        <CardHeader title="Hour × weekday" note="Every stream, by when it ended (Jakarta time)." />
        <div className="mt-5">
          <Heatmap heat={allTime.heat ?? {}} />
        </div>
      </section>

      <Section title="Listening by month">
        <div className="tile p-5 sm:p-6">
          <MonthBars
            bars={allTime.months.map((m) => ({
              key: m.month,
              label: `${monthLabel(m.month, false)} ${m.month.slice(2, 4)}`,
              value: hours(m.ms),
              detail: monthLabel(m.month),
            }))}
          />
        </div>
      </Section>

      <Section title="Streaks & binges">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="rise tile p-5 sm:p-6">
          <CardHeader
            icon={<IconBadge from="#E9B44C" to="#E4572E"><FlameIcon /></IconBadge>}
            title="Streaks"
            note="Days in a row with at least one stream."
          />
          <p className="eyebrow mt-6">Running now</p>
          <p className="font-display tabular text-5xl font-bold text-vermilion">
            {current?.days ?? 0}
            <span className="ml-2 text-2xl text-ink-soft">days</span>
          </p>
          <ol className="mt-6 space-y-2">
            {longest.map((s, i) => (
              <li key={s.start} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-3 py-2.5 sm:px-4">
                <span className="min-w-0 text-sm font-semibold sm:text-base">
                  {i === 0 && <span className="mr-2" aria-hidden>🏆</span>}
                  {dayLabel(s.start)} – {dayLabel(s.end)}
                </span>
                <span className="tabular shrink-0 font-bold">{s.days} d</span>
              </li>
            ))}
            {!longest.length && <li className="text-sm text-ink-soft">No streaks yet.</li>}
          </ol>
        </section>

        <section className="rise tile p-5 sm:p-6" style={{ ["--d" as string]: "100ms" }}>
          <CardHeader
            icon={<IconBadge from="#7B4B94" to="#D9667E"><ClockIcon /></IconBadge>}
            title="Binge sessions"
            note="The same track 5 or more times in a row."
          />
          <ol className="mt-6 space-y-2">
            {binges.slice(0, 8).map((b) => {
              const t = tracks.get(b.trackId);
              return (
                <li key={`${b.trackId}@${b.start}`} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2">
                  <Cover src={t?.album?.image} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/track/${b.trackId}`} className="block truncate font-semibold hover:underline">
                      {t?.name ?? "Unknown track"}
                    </Link>
                    <p className="truncate text-xs text-ink-soft">
                      {t?.artistName} · {dayLabel(dayKey(b.start))}
                    </p>
                  </div>
                  <span className="wiggle-hover shrink-0 rounded-full bg-mustard px-2.5 py-1 text-sm font-bold text-ink" style={{ rotate: "3deg" }}>
                    ×{b.count}
                  </span>
                  <SpotifyLink href={t?.url} />
                </li>
              );
            })}
            {!binges.length && (
              <li className="text-sm text-ink-soft">No binges yet. Put one song on repeat and see what happens.</li>
            )}
          </ol>
        </section>
      </div>
      </Section>
    </PageBody>
  );
}
