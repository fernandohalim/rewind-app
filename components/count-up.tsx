"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts up from 0 with a spring, landing with a small bounce. Tabular numerals, so it doesn't jitter. */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const fmt = (v: number) =>
    v.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(0, value, {
      type: "spring",
      stiffness: 60,
      damping: 14,
      onUpdate: (v) => (el.textContent = fmt(Math.max(0, v))),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);

  return (
    <span ref={ref} className="tabular">
      {fmt(value)}
    </span>
  );
}
