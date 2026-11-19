import { Suspense } from "react";
import { Cassette, Floater, LoadingTape, Note, Vinyl } from "@/components/decor";
import { HelloName, HomeTiles, JobsStatus, NowTop5, ThisDayYearsAgo, TilesSkeleton } from "@/components/home-live";
import { PageBody, PageHero, Section } from "@/components/page-hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="New obsession unlocked ✦"
        title={
          <Suspense fallback={<>Hey, you&apos;re in.</>}>
            <HelloName />
          </Suspense>
        }
        subtitle="Your tape is rolling. Every play gets logged, every half hour."
        decor={
          <>
            <Floater className="right-[6%] top-20 w-28 sm:right-[12%] sm:w-44" variant="b">
              <div className="spin-slow"><Vinyl /></div>
            </Floater>
            <Floater className="bottom-28 right-[34%] hidden w-12 sm:block" rotate={-10} delay={1}>
              <Note />
            </Floater>
          </>
        }
      />

      <PageBody>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          <Suspense fallback={<TilesSkeleton />}>
            <HomeTiles />
          </Suspense>
        </div>

        <Section title="On repeat lately" description="Spotify's top 5 tracks for your last 4 weeks.">
          <Suspense fallback={<LoadingTape label="Fetching your top 5…" />}>
            <NowTop5 />
          </Suspense>
        </Section>

        <Section title="This day, years ago" description="The track you played most on this date in earlier years.">
          <Suspense fallback={<LoadingTape label="Rewinding the years…" />}>
            <ThisDayYearsAgo />
          </Suspense>
        </Section>

        <Section
          title="Behind the scenes"
          description="The little machines that keep your tape rolling."
          aside={<Cassette className="float-a hidden w-28 sm:block" style={{ ["--r" as string]: "8deg" }} />}
        >
          <Suspense fallback={<div className="tile h-20 animate-pulse" />}>
            <JobsStatus />
          </Suspense>
        </Section>
      </PageBody>
    </main>
  );
}
