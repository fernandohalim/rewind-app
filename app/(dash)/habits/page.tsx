import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Cover, vtName } from "@/components/cover";
import { Floater, Headphones, LoadingTape, Note } from "@/components/decor";
import { CountTile } from "@/components/entity-parts";
import { EmptyState, PageHero, SectionTitle } from "@/components/page-hero";
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
      <div className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 pb-16">
        <EmptyState title="Habits come from your full history" icon={<Headphones className="w-20" />}>
          Spotify only records skips, shuffle and devices in the Extended Streaming History export.{" "}
          {h && h.plays > 0 ? `Meanwhile, the live logger estimates ${pct(h.skippedEst, h.plays)}% of recent plays were partial. ` : ""}
          <Link href="/import" className="font-semibold text-vermilion-deep underline">
            Import your export
          </Link>{" "}
          to fill this page in.
        </EmptyState>
      </div>
    );
  }

  const topDevice = Object.entries(h.platforms).filter(([k]) => k !== "Unknown").sort((a, b) => b[1] - a[1])[0];
  const startsTotal = Object.values(h.starts).reduce((s, v) => s + v, 0);
  const picked = (h.starts.clickrow ?? 0) + (h.starts.playbtn ?? 0);
  const skipMonths = (allTime.skipByMonth ?? []).filter((m) => m.known > 0);
  const keys = [...(allTime.mostSkipped ?? []), ...(allTime.neverSkipped ?? [])].map((a) => a.key);
  const artists = await getEntities<ArtistDoc>("artists", keys);

  return (
    <div className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 pb-20">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <CountTile label="Skip rate" value={pct(h.skipped, known)} decimals={1} unit="%" />
        <CountTile label="On shuffle" value={pct(h.shuffleOn, known)} decimals={1} unit="%" delay={60} />
        <CountTile label="You picked it" value={pct(picked, startsTotal)} decimals={1} unit="%" delay={120} />
        <div className="rise tile p-5" style={{ ["--d" as string]: "180ms" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Main device</p>
          <p className="font-display mt-1 text-3xl font-bold">{topDevice?.[0] ?? "–"}</p>
          {topDevice && <p className="text-sm text-ink-soft">{pct(topDevice[1], h.plays)}% of plays</p>}
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        Based on {known.toLocaleString("en")} plays from your export. Recent plays from the live logger only have estimated skips, so they
        aren&apos;t counted here.
      </p>

      {skipMonths.length > 1 && (
        <section className="mt-12">
          <SectionTitle>Skip rate by month</SectionTitle>
          <div className="tile mt-6 p-5 sm:p-7">
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
        </section>
      )}

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <BarList title="How tracks start" counts={h.starts} labels={STARTS} />
        <BarList title="How tracks end" counts={h.ends} labels={ENDS} />
        <BarList title="Where you listen" counts={h.platforms} />
        <section className="rise tile p-6">
          <h2 className="font-display text-2xl font-bold">Shuffle</h2>
          <div className="mt-5 flex h-6 overflow-hidden rounded-full">
            <div className="bg-vermilion" style={{ width: `${pct(h.shuffleOn, known)}%` }} />
            <div className="bg-[#008F7A]" style={{ width: `${pct(h.shuffleOff, known)}%`, marginLeft: 2 }} />
          </div>
          <ul className="mt-3 flex justify-between text-sm">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-vermilion" /> Shuffle on · {pct(h.shuffleOn, known)}%</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#008F7A]" /> In order · {pct(h.shuffleOff, known)}%</li>
          </ul>
        </section>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <SkipList title="Most skipped" note="You keep giving them a chance…" rows={allTime.mostSkipped ?? []} artists={artists} />
        <SkipList title="You never skip" note="Every track gets played out." rows={allTime.neverSkipped ?? []} artists={artists} />
      </div>
    </div>
  );
}

function BarList({ title, counts, labels }: { title: string; counts: Record<string, number>; labels?: Record<string, string> }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <section className="rise tile p-6">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {rows.map(([k, v]) => (
          <li key={k}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-semibold">{labels?.[k] ?? k}</span>
              <span className="tabular text-ink-soft">{pct(v, total)}%</span>
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
    <section className="rise tile p-6">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="text-sm text-ink-soft">{note} Artists with 15+ plays.</p>
      <ol className="mt-4 space-y-2">
        {rows.slice(0, 8).map((r) => {
          const a = artists.get(r.key);
          return (
            <li key={r.key}>
              <Link href={`/artist/${encodeURIComponent(r.key)}`} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-paper">
                <Cover src={a?.image} vt={title === "Most skipped" ? vtName("artist", r.key) : undefined} round className="h-9 w-9" />
                <span className="min-w-0 flex-1 truncate font-semibold">{a?.name ?? r.key}</span>
                <span className="tabular text-sm text-ink-soft">
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
