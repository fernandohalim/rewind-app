"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A sideways-scrolling row that centres its `aria-current` child, so the
 * selected chip is visible on phones even when it sits at the far end.
 */
export function ScrollRow({ className = "", watch, children }: { className?: string; watch?: unknown; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    const a = active.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    el.scrollLeft += a.left - r.left - (r.width - a.width) / 2;
  }, [watch]);
  return (
    <div ref={row} className={`scroll-row ${className}`}>
      {children}
    </div>
  );
}
