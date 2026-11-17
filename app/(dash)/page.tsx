import { Suspense } from "react";
import { Cassette, Floater, LoadingTape, Note, Vinyl } from "@/components/decor";
import { HelloName, HomeTiles, JobsStatus, NowTop5, ThisDayYearsAgo, TilesSkeleton } from "@/components/home-live";
import { PageHero, SectionTitle } from "@/components/page-hero";



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

      <section className="relative mx-auto -mt-20 grid w-full max-w-5xl gap-6 px-4 sm:grid-cols-3">
        <Suspense fallback={<TilesSkeleton />}>
          <HomeTiles />
        </Suspense>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pt-16">
        <SectionTitle>On repeat lately</SectionTitle>
        <p className="mt-4 text-ink-soft">Spotify&apos;s top 5 tracks for your last 4 weeks.</p>
        <div className="mt-6">
          <Suspense fallback={<LoadingTape label="Fetching your top 5…" />}>
            <NowTop5 />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pt-16">
        <SectionTitle>This day, years ago</SectionTitle>
        <div className="mt-6">
          <Suspense fallback={<LoadingTape label="Rewinding the years…" />}>
            <ThisDayYearsAgo />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <SectionTitle aside={<Cassette className="float-a hidden w-28 sm:block" style={{ ["--r" as string]: "8deg" }} />}>
          Behind the scenes
        </SectionTitle>
        <p className="mt-4 text-ink-soft">The little machines that keep your tape rolling.</p>
        <div className="mt-6">
          <Suspense fallback={<div className="tile h-20 animate-pulse" />}>
            <JobsStatus />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
