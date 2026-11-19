import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Cover, vtName } from "@/components/cover";
import { Floater, Headphones, LoadingTape, Note } from "@/components/decor";
import { CountTile, StatGrid, TextTile } from "@/components/entity-parts";
import { CardHeader, EmptyState, PageBody, PageHero, Section } from "@/components/page-hero";
import { SERIES } from "@/lib/chart-colors";
import { getEntities, type ArtistDoc } from "@/lib/entities";
import type { SkipArtist } from "@/lib/stats/habits";
import { getAllTime } from "@/lib/stats/read";
import { monthLabel } from "@/lib/time";

export const metadata = { title: "Habits · Rewind" };

const STARTS: Record<string, string> = {
  trackdone: "Autoplay after the last one",
  clickrow: "You picked it",
  fwdbtn: "Skipped forward to it",
  backbtn: "Went back to it",
  playbtn: "Pressed play",
  appload: "When the app opened",
  remote: "From another device",
  trackerror: "After a playback error",
  unknown: "Unknown",
};
const ENDS: Record<string, string> = {
  trackdone: "Played to the end",
  fwdbtn: "Skipped",
  backbtn: "Went back",
  endplay: "Stopped playing",
  logout: "Logged out",
  remote: "Changed on another device",
  unexpected_exit: "App closed",
  "unexpected-exit-while-paused": "App closed while paused",
  trackerror: "Playback error",
  unknown: "Unknown",
};

export default function HabitsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        kicker="From your Spotify export"
        title="Your listening habits"
        subtitle="Do you skip? Shuffle? Pick songs or let them play? Here's the honest answer."
        decor={
          <>
            <Floater className="right-[6%] top-24 w-24 sm:right-[13%] sm:w-32" rotate={10}>
              <Headphones />
            </Floater>
            <Floater className="bottom-32 right-[38%] hidden w-10 sm:block" rotate={-14} variant="b" delay={0.7}>
              <Note fill="#7B4B94" />
            </Floater>
          </>
        }
      />
      <Suspense fallback={<LoadingTape />}>
        <HabitsContent />
      </Suspense>
    </main>
  );
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

async function HabitsContent() {
  await connection();
  const allTime = await getAllTime();
  const h = allTime?.habits;
  const known = h ? h.shuffleOn + h.shuffleOff : 0; // plays from the export

  if (!allTime || !h || known === 0) {
    return (
      <PageBody>
        <EmptyState title="Habits come from your full history" icon={<Headphones className="w-20" />}>
          Spotify only records skips, shuffle and devices in the Extended Streaming History export.{" "}
          {h && h.plays > 0 ? `Meanwhile, the live logger estimates ${pct(h.skippedEst, h.plays)}% of recent plays were partial. ` : ""}
          <Link href="/import" className="font-semibold text-vermilion-deep underline">
            Import your export
          </Link>{" "}
          to fill this page in.
        </EmptyState>
      </PageBody>
    );
  }

  const topDevice = Object.entries(h.platforms).filter(([k]) => k !== "Unknown").sort((a, b) => b[1] - a[1])[0];
  const startsTotal = Object.values(h.starts).reduce((s, v) => s + v, 0);
  const picked = (h.starts.clickrow ?? 0) + (h.starts.playbtn ?? 0);
  const skipMonths = (allTime.skipByMonth ?? []).filter((m) => m.known > 0);
  const keys = [...(allTime.mostSkipped ?? []), ...(allTime.neverSkipped ?? [])].map((a) => a.key);
  const artists = await getEntities<ArtistDoc>("artists", keys);

  return (
    <PageBody>
      <StatGrid>
        <CountTile label="Skip rate" value={pct(h.skipped, known)} decimals={1} unit="%" />
        <CountTile label="On shuffle" value={pct(h.shuffleOn, known)} decimals={1} unit="%" delay={60} />
        <CountTile label="You picked it" value={pct(picked, startsTotal)} decimals={1} unit="%" delay={120} />
        <TextTile label="Main device" note={topDevice ? `${pct(topDevice[1], h.plays)}% of plays` : undefined} delay={180}>
          {topDevice?.[0] ?? "–"}
        </TextTile>
      </StatGrid>
      <p className="mt-3 px-1 text-xs text-ink-soft">
        Based on {known.toLocaleString("en")} plays from your export. Recent plays from the live logger only have estimated skips, so they
        aren&apos;t counted here.
      </p>

      {skipMonths.length > 1 && (
        <Section title="Skip rate by month">
          <div className="tile p-5 sm:p-6">
            <LineChart
              unit="% skipped"
              points={skipMonths.map((m) => ({
                key: m.month,
                label: `${monthLabel(m.month, false)} ${m.month.slice(2, 4)}`,
                value: pct(m.skipped, m.known),
                detail: monthLabel(m.month),
              }))}
            />
          </div>
        </Section>
      )}

      <Section title="How you press play">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <BarList title="How tracks start" counts={h.starts} labels={STARTS} />
        <BarList title="How tracks end" counts={h.ends} labels={ENDS} />
        <BarList title="Where you listen" counts={h.platforms} />
        <section className="rise tile flex flex-col p-5 sm:p-6">
          <CardHeader title="Shuffle" note="Was shuffle on when the track played?" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-paper px-4 py-3">
              <p className="eyebrow flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-vermilion" /> Shuffle on</p>
              <p className="font-display tabular mt-1 text-3xl font-bold">{pct(h.shuffleOn, known)}<span className="ml-1 text-lg text-ink-soft">%</span></p>
            </div>
            <div className="rounded-2xl bg-paper px-4 py-3">
              <p className="eyebrow flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal" /> In order</p>
              <p className="font-display tabular mt-1 text-3xl font-bold">{pct(h.shuffleOff, known)}<span className="ml-1 text-lg text-ink-soft">%</span></p>
            </div>
          </div>
          <div className="mt-5 flex h-4 gap-0.5 overflow-hidden rounded-full">
            <div className="bg-vermilion" style={{ width: `${pct(h.shuffleOn, known)}%` }} />
            <div className="bg-teal" style={{ width: `${pct(h.shuffleOff, known)}%` }} />
          </div>
          <p className="mt-auto pt-5 text-sm text-ink-soft">
            {h.shuffleOn >= h.shuffleOff ? "You like to be surprised." : "You prefer things in order."}
          </p>
        </section>
      </div>
      </Section>

      <Section title="Skips by artist" description="Artists with 15+ plays.">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <SkipList title="Most skipped" note="You keep giving them a chance…" rows={allTime.mostSkipped ?? []} artists={artists} />
        <SkipList title="You never skip" note="Every track gets played out." rows={allTime.neverSkipped ?? []} artists={artists} />
      </div>
      </Section>
    </PageBody>
  );
}

function BarList({ title, counts, labels }: { title: string; counts: Record<string, number>; labels?: Record<string, string> }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <section className="rise tile p-5 sm:p-6">
      <CardHeader title={title} />
      <ul className="mt-4 space-y-3">
        {rows.map(([k, v]) => (
          <li key={k}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate font-semibold">{labels?.[k] ?? k}</span>
              <span className="tabular shrink-0 text-ink-soft">{pct(v, total)}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-paper-deep">
              <div className="h-2 rounded-full" style={{ width: `${(v / max) * 100}%`, background: SERIES }} />
            </div>
          </li>
        ))}
        {!rows.length && <li className="text-sm text-ink-soft">Nothing recorded yet.</li>}
      </ul>
    </section>
  );
}

function SkipList({ title, note, rows, artists }: { title: string; note: string; rows: SkipArtist[]; artists: Map<string, ArtistDoc> }) {
  return (
    <section className="rise tile p-5 sm:p-6">
      <CardHeader title={title} note={note} />
      <ol className="mt-4 space-y-2">
        {rows.slice(0, 8).map((r) => {
          const a = artists.get(r.key);
          return (
            <li key={r.key}>
              <Link href={`/artist/${encodeURIComponent(r.key)}`} className="-mx-1 flex items-center gap-3 rounded-2xl px-1 py-1.5 transition hover:bg-paper">
                <Cover src={a?.image} vt={title === "Most skipped" ? vtName("artist", r.key) : undefined} round className="h-9 w-9" />
                <span className="min-w-0 flex-1 truncate font-semibold">{a?.name ?? r.key}</span>
                <span className="tabular shrink-0 text-sm text-ink-soft">
                  {Math.round(r.rate * 100)}% of {r.plays}
                </span>
              </Link>
            </li>
          );
        })}
        {!rows.length && <li className="text-sm text-ink-soft">Not enough plays yet.</li>}
      </ol>
    </section>
  );
}
