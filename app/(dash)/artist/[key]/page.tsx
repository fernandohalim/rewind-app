import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MonthBars } from "@/components/charts/month-bars";
import { Cover, vtName } from "@/components/cover";
import { LoadingTape, Sparkle } from "@/components/decor";
import { CountTile, quip, StatGrid, TextTile } from "@/components/entity-parts";
import { CardHeader, EmptyState, PageBody, PageHero, Section } from "@/components/page-hero";
import { SpotifyIcon, SpotifyLink } from "@/components/spotify";
import { getDb } from "@/lib/firebase/admin";
import type { ArtistDoc, TrackDoc } from "@/lib/entities";
import { artistKey } from "@/lib/plays/keys";
import { getAllTime, getSeries, hours } from "@/lib/stats/read";
import { monthLabel } from "@/lib/time";

type Params = Promise<{ key: string }>;

export default function ArtistPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<LoadingTape label="Pulling the record off the shelf…" />}>
      <ArtistContent params={params} />
    </Suspense>
  );
}

const title = (g: string) => g.replace(/\b\w/g, (c) => c.toUpperCase());

async function ArtistContent({ params }: { params: Params }) {
  await connection();
  const key = decodeURIComponent((await params).key);
  const db = getDb();
  const snap = await db.doc(`artists/${key}`).get();
  if (!snap.exists) notFound();
  const a = snap.data() as ArtistDoc;

  const [allTime, artistSeries, trackSeries, tracksSnap] = await Promise.all([
    getAllTime(),
    getSeries("artists"),
    getSeries("tracks"),
    db.collection("tracks").where("artistKey", "==", key).limit(100).get(),
  ]);
  const s = artistSeries?.entries[key];
  const ranked = allTime?.topArtistsByMs.find((r) => r.id === key);
  const count = s?.count ?? ranked?.count ?? 0;
  const ms = s?.ms ?? ranked?.ms ?? 0;
  const first = allTime?.firstMonth?.[key] ?? s?.first;
  const last = s?.last;
  const rank = allTime ? allTime.topArtistsByMs.findIndex((r) => r.id === key) : -1;

  const tracks = tracksSnap.docs
    .map((d) => ({ id: d.id, t: d.data() as TrackDoc, plays: trackSeries?.entries[d.id]?.count ?? 0 }))
    .sort((x, y) => y.plays - x.plays)
    .slice(0, 10);
  const known = new Set(Object.keys(allTime?.firstMonth ?? {}));
  const months = s ? Object.keys(s.months).sort() : [];
  const allMonths = allTime?.months.map((m) => m.month).filter((m) => months.length && m >= months[0]) ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker={rank >= 0 ? `#${rank + 1} all time` : "Artist"}
        title={a.name}
        subtitle={count ? `You've streamed ${a.name} ${count.toLocaleString("en")} times. ${quip(count, "artist")}` : "Not much listening logged yet."}
        decor={
          <div className="float-b pointer-events-none absolute right-[5%] top-24 hidden lg:block" style={{ ["--r" as string]: "4deg" }}>
            <div className="relative">
              <Cover src={a.image} vt={vtName("artist", key)} round className="h-44 w-44 shadow-2xl ring-8 ring-white/30" />
              <Sparkle className="twinkle absolute -left-3 top-2 w-6" fill="#E9B44C" />
            </div>
          </div>
        }
      />

      <PageBody>
        <div className="tile relative flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-4">
          <Cover src={a.image} round className="h-12 w-12 lg:hidden" />
          {(a.genres ?? []).length ? (
            a.genres!.map((g, i) => (
              <span key={g} className="wiggle-hover rounded-full bg-paper-deep px-3 py-1 text-sm font-semibold" style={{ rotate: `${i % 2 ? 2 : -2}deg` }}>
                {title(g)}
              </span>
            ))
          ) : (
            <span className="text-sm text-ink-soft">Genres arrive once enrichment reaches this artist.</span>
          )}
          <span className="ml-auto">
            <SpotifyLink href={a.url ?? (a.spotifyId ? `https://open.spotify.com/artist/${a.spotifyId}` : undefined)} />
          </span>
        </div>

        <div className="mt-6">
        <StatGrid>
          <CountTile label="Streams" value={count} />
          <CountTile label="Hours" value={Math.round(hours(ms) * 10) / 10} decimals={1} unit="h" delay={60} />
          <TextTile label="First heard" delay={120}>{first ? monthLabel(first) : "–"}</TextTile>
          <TextTile label="Last played" delay={180}>{last ? monthLabel(last) : "–"}</TextTile>
        </StatGrid>
        </div>

        {s ? (
          <Section title="Streams by month">
            <div className="tile p-5 sm:p-6">
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
          </Section>
        ) : (
          <div className="mt-14 sm:mt-16">
            <EmptyState title="No timeline yet">Timelines are kept for your top 300 artists by minutes.</EmptyState>
          </div>
        )}

        <Section title="Deeper cuts">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <section className="tile p-5 sm:p-6">
            <CardHeader title="Your top tracks" note={`Most-played songs by ${a.name}.`} />
            <ol className="mt-4 space-y-2">
              {tracks.map((t, i) => (
                <li key={t.id} className="rise" style={{ ["--d" as string]: `${i * 35}ms` }}>
                  <div className="-mx-1 flex items-center gap-3 rounded-2xl px-1 py-1.5 transition hover:bg-paper">
                    <span className="font-display tabular w-6 shrink-0 text-right text-lg font-bold text-ink/70">{i + 1}</span>
                    <Link href={`/track/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Cover src={t.t.album?.image} vt={vtName("track", t.id)} className="h-10 w-10" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{t.t.name}</span>
                    </Link>
                    <span className="tabular shrink-0 text-sm text-ink-soft">{t.plays ? `${t.plays}×` : ""}</span>
                    <SpotifyLink href={t.t.url} />
                  </div>
                </li>
              ))}
              {!tracks.length && <li className="text-sm text-ink-soft">No tracks stored yet.</li>}
            </ol>
          </section>

          <section className="tile p-5 sm:p-6">
            <CardHeader title="Sounds like" note="Similar artists from Last.fm." />
            <ul className="mt-4 flex flex-wrap gap-2">
              {(a.similar ?? []).slice(0, 16).map((sim) => {
                const k = artistKey(sim.name);
                const inLibrary = known.has(k);
                return (
                  <li key={sim.name}>
                    {inLibrary ? (
                      <Link href={`/artist/${encodeURIComponent(k)}`} className="block rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                        {sim.name}
                      </Link>
                    ) : (
                      <a
                        href={`https://open.spotify.com/search/${encodeURIComponent(sim.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5"
                      >
                        <SpotifyIcon className="h-4 w-4" />
                        {sim.name}
                      </a>
                    )}
                  </li>
                );
              })}
              {!(a.similar ?? []).length && <li className="text-sm text-ink-soft">Nothing yet. Needs Last.fm enrichment.</li>}
            </ul>
            {(a.similar ?? []).length > 0 && (
              <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
                <span className="inline-block h-3 w-3 rounded-full bg-teal" /> already in your library
              </p>
            )}
          </section>
        </div>
        </Section>
      </PageBody>
    </main>
  );
}
