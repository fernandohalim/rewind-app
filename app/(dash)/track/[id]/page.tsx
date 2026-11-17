import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MonthBars } from "@/components/charts/month-bars";
import { Cover, vtName } from "@/components/cover";
import { LoadingTape, Note } from "@/components/decor";
import { CountTile, quip, TextTile } from "@/components/entity-parts";
import { EmptyState, PageHero, SectionTitle } from "@/components/page-hero";
import { SpotifyLink } from "@/components/spotify";
import { getDb } from "@/lib/firebase/admin";
import type { TrackDoc } from "@/lib/entities";
import { getAllTime, getSeries, hours } from "@/lib/stats/read";
import { dayKey, dayLabel, monthLabel } from "@/lib/time";

type Params = Promise<{ id: string }>;

export default function TrackPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<LoadingTape label="Cueing up the track…" />}>
      <TrackContent params={params} />
    </Suspense>
  );
}

async function TrackContent({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) notFound();
  const snap = await getDb().doc(`tracks/${id}`).get();
  if (!snap.exists) notFound();
  const t = snap.data() as TrackDoc;

  const [allTime, series] = await Promise.all([getAllTime(), getSeries("tracks")]);
  const s = series?.entries[id];
  const ranked = allTime?.topTracksByMs.find((r) => r.id === id);
  const count = s?.count ?? ranked?.count ?? 0;
  const ms = s?.ms ?? ranked?.ms ?? 0;
  const rank = allTime ? allTime.topTracksByMs.findIndex((r) => r.id === id) : -1;
  const binges = (allTime?.binges ?? []).filter((b) => b.trackId === id);
  const months = s ? Object.keys(s.months).sort() : [];
  const allMonths = allTime?.months.map((m) => m.month).filter((m) => months.length && m >= months[0]) ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker={rank >= 0 ? `#${rank + 1} all time` : "Track"}
        title={t.name}
        subtitle={
          <>
            by{" "}
            <Link href={`/artist/${encodeURIComponent(t.artistKey)}`} className="font-semibold underline decoration-white/50 underline-offset-4 hover:decoration-white">
              {t.artists?.map((x) => x.name).join(", ") || t.artistName}
            </Link>
            {count ? <> · {count.toLocaleString("en")} streams. {quip(count, "track")}</> : null}
          </>
        }
        decor={
          <div className="float-a pointer-events-none absolute right-[5%] top-24 hidden sm:block" style={{ ["--r" as string]: "-5deg" }}>
            <div className="relative">
              <Cover src={t.album?.image} vt={vtName("track", id)} className="h-48 w-48 rounded-3xl shadow-2xl ring-8 ring-white/30" />
              <Note className="float-b absolute -bottom-4 -left-6 w-12" />
            </div>
          </div>
        }
      />

      <div className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 pb-20">
        <div className="tile relative flex items-center gap-3 p-4">
          <Cover src={t.album?.image} className="h-12 w-12 sm:hidden" />
          <p className="min-w-0 flex-1 truncate text-sm text-ink-soft">
            {t.album?.name ?? "Unknown album"}
            {t.releaseDate ? ` · ${t.releaseDate.slice(0, 4)}` : ""}
            {t.durationMs ? ` · ${Math.floor(t.durationMs / 60000)}:${String(Math.round((t.durationMs % 60000) / 1000)).padStart(2, "0")}` : ""}
          </p>
          <SpotifyLink href={t.url ?? `https://open.spotify.com/track/${id}`} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <CountTile label="Streams" value={count} />
          <CountTile label="Minutes" value={Math.round(ms / 60000)} unit="min" delay={60} />
          <TextTile label="First streamed" delay={120}>{s ? monthLabel(s.first) : "–"}</TextTile>
          <TextTile label="Last streamed" delay={180}>{s ? monthLabel(s.last) : "–"}</TextTile>
        </div>

        {s ? (
          <section className="mt-12">
            <SectionTitle>Streams by month</SectionTitle>
            <div className="tile mt-6 p-5 sm:p-7">
              <MonthBars
                unit="streams"
                decimals={0}
                bars={allMonths.map((m) => ({
                  key: m,
                  label: `${monthLabel(m, false)} ${m.slice(2, 4)}`,
                  value: s.months[m] ?? 0,
                  detail: monthLabel(m),
                }))}
              />
            </div>
          </section>
        ) : (
          <div className="mt-12">
            <EmptyState title="No timeline yet">
              Timelines are kept for your top 300 tracks by minutes. {hours(ms) > 0 ? "This one isn't there yet." : ""}
            </EmptyState>
          </div>
        )}

        {binges.length > 0 && (
          <section className="mt-12">
            <SectionTitle>On repeat</SectionTitle>
            <ul className="mt-6 flex flex-wrap gap-3">
              {binges.map((b) => (
                <li key={b.start} className="wiggle-hover tile px-4 py-3" style={{ rotate: "-1deg" }}>
                  <span className="font-display text-2xl font-bold text-vermilion">×{b.count}</span>
                  <span className="ml-2 text-sm text-ink-soft">in a row on {dayLabel(dayKey(b.start))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
