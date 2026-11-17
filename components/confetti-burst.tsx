"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

const COLORS = ["#E4572E", "#E9B44C", "#2E7D7A", "#7B4B94", "#4A90C2", "#D9667E"];

/** A tiny one-shot confetti burst (for a new #1). Re-fires when `fireKey` changes. */
export function ConfettiBurst({ fireKey }: { fireKey: string }) {
  const reduced = useReducedMotion();
  const bits = useMemo(() => makeBits(fireKey), [fireKey]);

  if (reduced) return null;
  return (
    <span key={fireKey} aria-hidden className="pointer-events-none absolute left-10 top-1/2 z-20">
      {bits.map((b) => (
        <motion.span
          key={b.i}
          className="absolute block"
          style={{ width: b.w, height: b.round ? b.w : b.w * 1.8, background: b.color, borderRadius: b.round ? 9999 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 70], opacity: [1, 1, 0], rotate: b.r, scale: 1 }}
          transition={{ duration: 1.3, delay: 0.35 + b.delay, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

/** Deterministic pseudo-random spread per key, so renders stay pure. */
function makeBits(fireKey: string) {
    let seed = [...fireKey].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    return Array.from({ length: 26 }, (_, i) => {
      const angle = rnd() * Math.PI * 2;
      const dist = 60 + rnd() * 90;
      return {
        i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 40,
        r: rnd() * 540 - 270,
        w: 5 + rnd() * 5,
        round: rnd() > 0.5,
        color: COLORS[i % COLORS.length],
        delay: rnd() * 0.12,
      };
    });
}
