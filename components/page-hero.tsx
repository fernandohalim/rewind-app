import Link from "next/link";
import type { ReactNode } from "react";
import { RewindMark, Sparkle, Wave } from "./decor";
import { NavLinks } from "./nav";

/** Gradient header band shared by every dashboard page. */
export function PageHero({
  kicker,
  title,
  subtitle,
  decor,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  decor?: ReactNode;
}) {
  return (
    <section className="bg-sunset relative isolate overflow-hidden px-4 pb-28 pt-4 text-white sm:pb-36 sm:pt-5">
      <div className="blob -left-16 top-0 h-64 w-64 bg-[#4A90C2]" />
      <div className="blob right-0 top-24 h-72 w-72 bg-[#E9B44C]" />

      <nav className="relative z-20 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <Link href="/" className="flex items-center gap-2 rounded-full">
          <RewindMark className="h-9 w-9" />
          <span className="font-display text-xl font-bold">Rewind</span>
        </Link>
        <NavLinks />
        <form action="/api/auth/logout" method="post">
          <button className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/40 backdrop-blur transition hover:bg-white/25">
            Log out
          </button>
        </form>
      </nav>

      {/* Decorations sit below the two-row phone header and shrink on small screens. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 top-16 origin-top-right max-sm:scale-[0.72] lg:top-0">
        {decor}
        <Sparkle className="twinkle absolute left-[46%] top-24 w-5" />
        <Sparkle className="twinkle absolute bottom-36 right-[4%] w-4" style={{ animationDelay: "1.2s" }} fill="#E9B44C" />
      </div>

      <div className="relative z-10 mx-auto mt-8 max-w-5xl sm:mt-14">
        {kicker && (
          <span
            className="rise wiggle-hover inline-block rounded-full bg-mustard px-3 py-1 text-sm font-bold text-ink"
            style={{ rotate: "-2deg" }}
          >
            {kicker}
          </span>
        )}
        <h1
          className="rise font-display mt-4 max-w-2xl text-[2.75rem] font-bold leading-[0.95] tracking-tight [overflow-wrap:anywhere] drop-shadow-[0_4px_18px_rgba(61,34,102,0.35)] sm:mt-5 sm:text-7xl"
          style={{ ["--d" as string]: "80ms" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="rise mt-3 max-w-lg text-base text-white/90 sm:mt-4 sm:text-lg" style={{ ["--d" as string]: "160ms" }}>
            {subtitle}
          </p>
        )}
      </div>

      <Wave className="absolute inset-x-0 bottom-0 h-16 w-full sm:h-28" />
    </section>
  );
}

/** The content column that overlaps the hero's wave. Same on every page. */
export function PageBody({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`relative z-10 mx-auto -mt-16 w-full px-4 pb-20 ${narrow ? "max-w-3xl" : "max-w-5xl"}`}>{children}</div>
  );
}

/** A titled block of a page. Every top-level section uses the same rhythm. */
export function Section({
  title,
  description,
  aside,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-14 sm:mt-16">
      <SectionTitle aside={aside}>{title}</SectionTitle>
      {description && <p className="mt-4 max-w-xl text-ink-soft">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Section heading with the little vermilion underline. */
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">{children}</h2>
        <div className="mt-3 h-1 w-14 rounded-full bg-vermilion" />
      </div>
      {aside}
    </div>
  );
}

/** Heading row inside a tile: optional icon badge, title, and a one-line note. */
export function CardHeader({ icon, title, note }: { icon?: ReactNode; title: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      {icon}
      <div className="min-w-0">
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        {note && <p className="mt-0.5 text-sm text-ink-soft">{note}</p>}
      </div>
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
