import {
  Cassette,
  Floater,
  Headphones,
  IconBadge,
  Note,
  RewindMark,
  Sparkle,
  Vinyl,
  Wave,
} from "@/components/decor";
import { ClockIcon, ShapesIcon, TrophyIcon } from "@/components/icons";

export const metadata = { title: "Log in · Rewind" };

const features = [
  {
    title: "Your top lists",
    body: "Tracks and artists for 4 weeks, 6 months and a year. Watch them climb and fall.",
    from: "#E4572E",
    to: "#D9667E",
    icon: <TrophyIcon />,
  },
  {
    title: "Every single play",
    body: "Heatmaps, streaks and binge sessions, logged every half hour.",
    from: "#7B4B94",
    to: "#4A90C2",
    icon: <ClockIcon />,
  },
  {
    title: "Your eras",
    body: "Genres month by month, so you can see the phases you went through.",
    from: "#2E7D7A",
    to: "#8A9A3B",
    icon: <ShapesIcon />,
  },
];

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="bg-sunset relative isolate overflow-hidden px-4 pb-40 pt-6 text-white sm:pb-48">
        <div className="blob -left-24 top-10 h-72 w-72 bg-[#4A90C2]" />
        <div className="blob -right-20 top-40 h-80 w-80 bg-[#E9B44C]" />
        <div className="blob left-1/3 -top-24 h-64 w-64 bg-[#D9667E]" />

        <nav className="relative z-10 mx-auto flex max-w-5xl items-center gap-2">
          <RewindMark className="h-9 w-9" />
          <span className="font-display text-xl font-bold">Rewind</span>
        </nav>

        {/* Floating bits */}
        <Floater className="left-[4%] top-28 w-24 sm:left-[10%] sm:w-36" rotate={-12}>
          <Cassette />
        </Floater>
        <Floater className="right-[4%] top-24 w-20 sm:right-[12%] sm:w-32" variant="b" delay={0.8}>
          <div className="spin-slow"><Vinyl label="#E9B44C" /></div>
        </Floater>
        <Floater className="bottom-36 left-[14%] hidden w-28 sm:block" rotate={10} variant="b" delay={1.4}>
          <Headphones />
        </Floater>
        <Floater className="bottom-44 right-[16%] w-10 sm:w-14" rotate={-8} delay={0.4}>
          <Note />
        </Floater>
        <Floater className="right-[30%] top-24 hidden w-8 sm:block" rotate={14} variant="b" delay={2}>
          <Note fill="#2E7D7A" />
        </Floater>
        <Sparkle className="twinkle absolute left-[28%] top-36 w-5" />
        <Sparkle className="twinkle absolute right-[24%] top-[55%] w-4" style={{ animationDelay: "1s" }} fill="#E9B44C" />
        <Sparkle className="twinkle absolute left-[8%] top-[62%] w-6" style={{ animationDelay: "1.8s" }} />

        <div className="relative z-10 mx-auto mt-24 flex max-w-2xl flex-col items-center text-center sm:mt-28">
          <span
            className="rise wiggle-hover inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/40 backdrop-blur"
            style={{ ["--r" as string]: "-3deg", rotate: "-3deg" }}
          >
            ✦ Wrapped, any day you like
          </span>
          <h1
            className="rise font-display mt-6 text-6xl font-bold leading-[0.95] tracking-tight drop-shadow-[0_4px_18px_rgba(61,34,102,0.35)] sm:text-8xl"
            style={{ ["--d" as string]: "80ms" }}
          >
            Your listening,
            <br />
            played back.
          </h1>
          <p
            className="rise mt-6 max-w-lg text-lg text-white/90 sm:text-xl"
            style={{ ["--d" as string]: "160ms" }}
          >
            Rewind turns every song you&apos;ve ever played into stats, streaks and
            little surprises.
          </p>
          <a
            href="/api/auth/login"
            className="rise group mt-10 inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-[0.14em] text-plum-deep shadow-[0_16px_32px_-10px_rgba(61,34,102,0.6)] transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.03] active:scale-95"
            style={{ ["--d" as string]: "240ms" }}
          >
            Connect Spotify
            <RewindMark className="h-8 w-8 transition-transform duration-500 group-hover:rotate-[-360deg]" />
          </a>
        </div>

        <Wave className="absolute inset-x-0 bottom-0 h-24 w-full sm:h-32" />
      </section>

      {/* Features */}
      <section className="relative mx-auto -mt-16 grid w-full max-w-5xl gap-6 px-4 pb-20 sm:grid-cols-3">
        {features.map((f, i) => (
          <article
            key={f.title}
            className={`rise tile tile-hover p-7 ${i === 1 ? "sm:relative sm:-top-8" : ""}`}
            style={{ ["--d" as string]: `${360 + i * 120}ms` }}
          >
            <IconBadge from={f.from} to={f.to}>{f.icon}</IconBadge>
            <h2 className="font-display mt-6 text-2xl font-bold">{f.title}</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="pb-10 text-center text-sm text-ink-soft">
        Made for one listener. Data from Spotify, MusicBrainz and Last.fm.
      </footer>
    </main>
  );
}
