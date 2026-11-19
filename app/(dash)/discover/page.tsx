import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StackedBars } from "@/components/charts/stacked-bars";
import { Cover } from "@/components/cover";
import { Floater, Headphones, LoadingTape, Note, Sparkle, Vinyl } from "@/components/decor";
import { CardHeader, EmptyState, PageBody, PageHero, Section } from "@/components/page-hero";
import { SpotifyLink } from "@/components/spotify";
import { CATEGORICAL } from "@/lib/chart-colors";
import { getEntities, type ArtistDoc } from "@/lib/entities";
import { lastfmEnabled } from "@/lib/enrich/lastfm";
import { artistKey } from "@/lib/plays/keys";
import { getAllTime } from "@/lib/stats/read";
import type { AllTimeDoc } from "@/lib/stats/types";
import { monthLabel } from "@/lib/time";

export const metadata = { title: "Discover · Rewind" };

export default function DiscoverPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="New to you"
        title="Fresh finds"
        subtitle="The artists you found, the ones that stuck, and the ones you haven't met yet."
        decor={
          <>
            <Floater className="right-[6%] top-24 w-24 sm:right-[14%] sm:w-32" rotate={-8}>
              <Headphones />
            </Floater>
            <Floater className="bottom-32 right-[36%] hidden w-12 sm:block" rotate={10} variant="b" delay={0.8}>
              <Note fill="#3A84C4" />
            </Floater>
          </>
        }
      />
      <Suspense fallback={<LoadingTape />}>
        <DiscoverContent />
      </Suspense>
    </main>
  );
}

async function DiscoverContent() {
  await connection();
  const allTime = await getAllTime();
  if (!allTime) {
    return (
      <PageBody>
        <EmptyState title="Nothing discovered yet" icon={<Headphones className="w-20" />}>
          Discoveries appear after the first nightly rollup.
        </EmptyState>
      </PageBody>
    );
  }

  const recent = allTime.recentDiscoveries ?? [];
  const [recentDocs, similar] = await Promise.all([
    getEntities<ArtistDoc>("artists", recent.map((r) => r.key)),
    neverPlayed(allTime),
  ]);
  const discovery = allTime.discovery ?? [];

  return (
    <PageBody>
      <section className="tile relative p-5 sm:p-6">
        <CardHeader title="New artists per month" note={<>&ldquo;Stuck&rdquo; means 3+ streams in the 3 months after you first heard them.</>} />
        <div className="mt-5">
          <StackedBars
            series={[
              { key: "stuck", label: "Stuck around", color: CATEGORICAL[1] },
              { key: "oneOff", label: "Passing through", color: CATEGORICAL[2] },
            ]}
            rows={discovery.map((d) => ({
              key: d.month,
              label: `${monthLabel(d.month, false)} ${d.month.slice(2, 4)}`,
              detail: monthLabel(d.month),
              values: { stuck: d.stuck, oneOff: d.newArtists - d.stuck },
            }))}
          />
        </div>
      </section>

      <Section title="Recent discoveries" description="First heard in the last 3 months, most-played first.">
        {recent.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(0, 12).map((r, i) => {
              const a = recentDocs.get(r.key);
              return (
                <li key={r.key} className="rise" style={{ ["--d" as string]: `${i * 40}ms` }}>
                  <Link href={`/artist/${encodeURIComponent(r.key)}`} className="tile tile-hover flex h-full items-center gap-3 p-4">
                    <Cover src={a?.image} round className="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a?.name ?? r.key}</p>
                      <p className="truncate text-xs text-ink-soft">
                        Since {monthLabel(r.firstMonth)} · {r.count} streams
                      </p>
                    </div>
                    {i < 3 && (
                      <span className="wiggle-hover shrink-0 rounded-full bg-mustard px-2 py-0.5 text-xs font-bold text-ink" style={{ rotate: "4deg" }}>
                        hot
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No new faces lately" icon={<Headphones className="w-20" />}>
            Nobody new in the last 3 months. Time for a deep dive?
          </EmptyState>
        )}
      </Section>

      <Section
        title="Similar to your favourites, never played"
        description="Last.fm's similar artists for your top 20, minus everyone you've already played."
      >
        {similar.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s, i) => (
              <li key={s.name} className="rise tile tile-hover relative flex items-center gap-3 p-4" style={{ ["--d" as string]: `${i * 40}ms` }}>
                {i === 0 && <Sparkle className="twinkle absolute -right-1 -top-1 w-5" fill="#E9B44C" />}
                <span
                  className="font-display grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl font-bold text-white"
                  style={{ background: CATEGORICAL[i % CATEGORICAL.length] }}
                  aria-hidden
                >
                  {s.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-ink-soft">Because you like {s.because.slice(0, 2).join(" & ")}</p>
                </div>
                <SpotifyLink href={`https://open.spotify.com/search/${encodeURIComponent(s.name)}`} label={`Find ${s.name} on Spotify`} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={lastfmEnabled() ? "Still looking" : "Needs a Last.fm key"} icon={<Vinyl className="spin-slow w-16" />}>
            {lastfmEnabled()
              ? "Suggestions appear once your top artists have been enriched (a few dozen a day)."
              : "Set LASTFM_API_KEY to get similar-artist suggestions."}
          </EmptyState>
        )}
      </Section>
    </PageBody>
  );
}

/** Last.fm similar artists of your top 20 by minutes, minus every artist you've played. */
async function neverPlayed(allTime: AllTimeDoc) {
  const top = allTime.topArtistsByMs.slice(0, 20).map((r) => r.id);
  const docs = await getEntities<ArtistDoc>("artists", top);
  const known = new Set(Object.keys(allTime.firstMonth ?? {}));
  const score = new Map<string, { name: string; score: number; because: string[] }>();
  for (const key of top) {
    const a = docs.get(key);
    for (const s of a?.similar ?? []) {
      const k = artistKey(s.name);
      if (known.has(k)) continue;
      const e = score.get(k) ?? { name: s.name, score: 0, because: [] };
      e.score += s.match;
      if (a && !e.because.includes(a.name)) e.because.push(a.name);
      score.set(k, e);
    }
  }
  return [...score.values()].sort((x, y) => y.score - x.score).slice(0, 12);
}
