import type { ReactNode } from "react";
import { RewindMark, Sparkle, Wave } from "./decor";
import { NavLinks } from "./nav";

/** Gradient header band shared by every dashboard page. */
export function PageHero({
  kicker,
  title,
  subtitle,
  decor,
  compact = false,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  decor?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`bg-sunset relative isolate overflow-hidden px-4 pt-5 text-white ${compact ? "pb-28" : "pb-36"}`}>
      <div className="blob -left-16 top-0 h-64 w-64 bg-[#4A90C2]" />
      <div className="blob right-0 top-24 h-72 w-72 bg-[#E9B44C]" />

      <nav className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RewindMark className="h-9 w-9" />
          <span className="font-display hidden text-xl font-bold sm:inline">Rewind</span>
        </div>
        <NavLinks />
        <form action="/api/auth/logout" method="post" className="hidden sm:block">
          <button className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/40 backdrop-blur transition hover:bg-white/25">
            Log out
          </button>
        </form>
      </nav>

      {decor}
      <Sparkle className="twinkle absolute left-[46%] top-24 w-5" />
      <Sparkle className="twinkle absolute bottom-36 right-[4%] w-4" style={{ animationDelay: "1.2s" }} fill="#E9B44C" />

      <div className={`relative z-10 mx-auto max-w-5xl ${compact ? "mt-10" : "mt-14"}`}>
        {kicker && (
          <span
            className="rise wiggle-hover inline-block rounded-full bg-mustard px-3 py-1 text-sm font-bold text-ink"
            style={{ rotate: "-2deg" }}
          >
            {kicker}
          </span>
        )}
        <h1
          className="rise font-display mt-5 max-w-2xl text-5xl font-bold leading-[0.95] tracking-tight drop-shadow-[0_4px_18px_rgba(61,34,102,0.35)] sm:text-7xl"
          style={{ ["--d" as string]: "80ms" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="rise mt-4 max-w-lg text-lg text-white/90" style={{ ["--d" as string]: "160ms" }}>
            {subtitle}
          </p>
        )}
      </div>

      <Wave className="absolute inset-x-0 bottom-0 h-20 w-full sm:h-28" />
    </section>
  );
}

/** Section heading with the little vermilion underline. */
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">{children}</h2>
        <div className="mt-3 h-1 w-14 rounded-full bg-vermilion" />
      </div>
      {aside}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="tile flex flex-col items-center gap-3 p-8 text-center">
      {icon}
      <p className="font-display text-2xl font-bold">{title}</p>
      <p className="max-w-md text-ink-soft">{children}</p>
    </div>
  );
}
