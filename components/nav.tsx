"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollRow } from "./scroll-row";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/top", label: "Top" },
  { href: "/history", label: "History" },
  { href: "/time", label: "Time" },
  { href: "/habits", label: "Habits" },
  { href: "/genres", label: "Genres" },
  { href: "/discover", label: "Discover" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    // Below lg the pill row takes its own full-width line and scrolls sideways.
    <ScrollRow watch={path} className="order-last -mx-4 w-[calc(100%+2rem)] px-4 lg:order-none lg:mx-0 lg:w-auto lg:px-0">
      <ul className="relative mx-auto flex w-max items-center gap-1 rounded-full bg-white/15 p-1 ring-1 ring-white/30 backdrop-blur">
        {LINKS.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition lg:px-4 ${
                  active ? "bg-white text-plum-deep shadow" : "text-white hover:bg-white/20"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </ScrollRow>
  );
}
