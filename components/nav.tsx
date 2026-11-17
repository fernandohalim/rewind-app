"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/top", label: "Top" },
  { href: "/history", label: "History" },
  { href: "/time", label: "Time" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <ul className="flex items-center gap-1 rounded-full bg-white/15 p-1 ring-1 ring-white/30 backdrop-blur">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${
                active ? "bg-white text-plum-deep shadow" : "text-white hover:bg-white/20"
              }`}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
