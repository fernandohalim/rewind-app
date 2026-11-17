import { connection } from "next/server";
import { Suspense } from "react";
import { Heatmap } from "@/components/charts/heatmap";
import { MonthBars } from "@/components/charts/month-bars";
import { Floater, Headphones, IconBadge, LoadingTape, Note } from "@/components/decor";
import { ClockIcon, FlameIcon } from "@/components/icons";
import { EmptyState, PageHero, SectionTitle } from "@/components/page-hero";
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
      <div className="mx-auto -mt-16 w-full max-w-5xl px-4 pb-16">
        <EmptyState title="The clock hasn't started" icon={<Headphones className="w-20" />}>
          Your listening clock fills in after the first nightly rollup.
        </EmptyState>
      </div>
    );
  }

  const binges = allTime.binges ?? [];
  const tracks = await getEntities<TrackDoc>("tracks", binges.map((b) => b.trackId));
  const { longest, current } = allTime.streaks;

  return (
    <div className="mx-auto -mt-16 w-full max-w-5xl px-4 pb-20">
      <section className="tile relative p-5 sm:p-7">
        <h2 className="font-display text-2xl font-bold">Hour × weekday</h2>
        <p className="mt-1 text-sm text-ink-soft">Every stream, by when it ended (Jakarta time).</p>
        <div className="mt-5">
          <Heatmap heat={allTime.heat ?? {}} />
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle>Listening by month</SectionTitle>
        <div className="tile mt-6 p-5 sm:p-7">
          <MonthBars
            bars={allTime.months.map((m) => ({
              key: m.month,
              label: `${monthLabel(m.month, false)} ${m.month.slice(2, 4)}`,
              value: hours(m.ms),
              detail: monthLabel(m.month),
            }))}
          />
        </div>
      </section>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="rise tile p-6">
          <div className="flex items-center gap-4">
            <IconBadge from="#E9B44C" to="#E4572E"><FlameIcon /></IconBadge>
            <div>
              <h2 className="font-display text-2xl font-bold">Streaks</h2>
              <p className="text-sm text-ink-soft">Days in a row with at least one stream.</p>
            </div>
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-soft">Running now</p>
          <p className="font-display tabular text-5xl font-bold text-vermilion">
            {current?.days ?? 0}
            <span className="ml-2 text-2xl text-ink-soft">days</span>
          </p>
          <ol className="mt-6 space-y-2">
            {longest.map((s, i) => (
              <li key={s.start} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2.5">
                <span className="font-semibold">
                  {i === 0 && <span className="mr-2" aria-hidden>🏆</span>}
                  {dayLabel(s.start)} – {dayLabel(s.end)}
                </span>
                <span className="tabular font-bold">{s.days} d</span>
              </li>
            ))}
            {!longest.length && <li className="text-sm text-ink-soft">No streaks yet.</li>}
          </ol>
        </section>

        <section className="rise tile p-6" style={{ ["--d" as string]: "100ms" }}>
          <div className="flex items-center gap-4">
            <IconBadge from="#7B4B94" to="#D9667E"><ClockIcon /></IconBadge>
            <div>
              <h2 className="font-display text-2xl font-bold">Binge sessions</h2>
              <p className="text-sm text-ink-soft">The same track 5 or more times in a row.</p>
            </div>
          </div>
          <ol className="mt-6 space-y-2">
            {binges.slice(0, 8).map((b) => {
              const t = tracks.get(b.trackId);
              return (
                <li key={`${b.trackId}@${b.start}`} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2">
                  {t?.album?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.album.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="h-10 w-10 rounded-lg bg-paper-deep" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t?.name ?? "Unknown track"}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {t?.artistName} · {dayLabel(dayKey(b.start))}
                    </p>
                  </div>
                  <span className="wiggle-hover rounded-full bg-mustard px-2.5 py-1 text-sm font-bold" style={{ rotate: "3deg" }}>
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
    </div>
  );
}
