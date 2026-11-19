import { connection } from "next/server";
import { Suspense } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Floater, LoadingTape, Note, Sparkle, Vinyl } from "@/components/decor";
import { GenreExplorer } from "@/components/genre-explorer";
import { EmptyState, PageBody, PageHero, Section } from "@/components/page-hero";
import { CATEGORICAL, OTHER } from "@/lib/chart-colors";
import { getAllTime } from "@/lib/stats/read";
import { monthLabel } from "@/lib/time";

export const metadata = { title: "Genres · Rewind" };

export default function GenresPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="Tags from MusicBrainz & Last.fm"
        title="Your eras"
        subtitle="Press play and watch your taste shift, month by month."
        decor={
          <>
            <Floater className="right-[6%] top-24 w-24 sm:right-[12%] sm:w-40" variant="b">
              <div className="spin-slow"><Vinyl label="#008F7A" /></div>
            </Floater>
            <Floater className="bottom-32 right-[38%] hidden w-10 sm:block" rotate={-12} delay={0.6}>
              <Note fill="#E4572E" />
            </Floater>
          </>
        }
      />
      <Suspense fallback={<LoadingTape />}>
        <GenresContent />
      </Suspense>
    </main>
  );
}

const title = (g: string) => g.replace(/\b\w/g, (c) => c.toUpperCase());

async function GenresContent() {
  await connection();
  const allTime = await getAllTime();
  const months = (allTime?.genreMonths ?? []).filter((m) => m.tagged > 0);

  if (!allTime || !months.length) {
    return (
      <PageBody>
        <EmptyState title="Genres are on their way" icon={<Vinyl className="spin-slow w-16" />}>
          Rewind looks up a few dozen of your artists every day on MusicBrainz and Last.fm. Your genre chart appears after
          the next nightly rollup once some are tagged.
        </EmptyState>
      </PageBody>
    );
  }

  const colorOf = (g: string) => CATEGORICAL[allTime.topGenres.indexOf(g)] ?? OTHER;
  const eras = [...allTime.eras].reverse();

  return (
    <PageBody>
      <GenreExplorer genres={allTime.topGenres} months={months} diversity={allTime.diversity} />
      <p className="mt-3 px-1 text-xs text-ink-soft">
        Each artist&apos;s minutes count toward their main genre. {Math.round(allTime.tagCoverage * 100)}% of your listening
        comes from artists with genres so far; the rest fills in as enrichment runs.
      </p>

      <Section title="Eras" description="Stretches of 2+ months where one genre led your listening.">
        {eras.length ? (
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eras.map((e, i) => (
              <li key={`${e.genre}-${e.start}`} className="rise tile tile-hover relative overflow-hidden p-5" style={{ ["--d" as string]: `${i * 70}ms` }}>
                <span className="absolute inset-x-0 top-0 h-2" style={{ background: colorOf(e.genre) }} />
                <Sparkle className="twinkle absolute right-4 top-5 w-4" fill={colorOf(e.genre)} />
                <p className="eyebrow pr-6">
                  {monthLabel(e.start)} – {monthLabel(e.end)}
                </p>
                <p className="font-display mt-2 text-2xl font-bold">The {title(e.genre)} era</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {e.months} months · {Math.round(e.share * 100)}% of tagged minutes
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="No eras yet" icon={<Vinyl className="spin-slow w-16" />}>
            An era needs at least two months led by the same genre. Keep listening.
          </EmptyState>
        )}
      </Section>

      <Section
        title="Diversity"
        description="How spread out your listening is each month, as the number of equally-played artists it's worth. Higher means more variety."
      >
        <div className="tile p-5 sm:p-6">
          <LineChart
            unit="artists"
            color={CATEGORICAL[1]}
            points={allTime.diversity.map((d) => ({
              key: d.month,
              label: `${monthLabel(d.month, false)} ${d.month.slice(2, 4)}`,
              value: d.artistsEff,
              detail: monthLabel(d.month),
            }))}
          />
        </div>
      </Section>
    </PageBody>
  );
}
