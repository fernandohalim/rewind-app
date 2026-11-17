import type { ReactNode } from "react";
import { CountUp } from "./count-up";

/** Big stat tile with a counting number. */
export function CountTile({
  label,
  value,
  decimals = 0,
  unit,
  delay = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  delay?: number;
}) {
  return (
    <div className="rise tile p-5" style={{ ["--d" as string]: `${delay}ms` }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="font-display mt-1 text-4xl font-bold">
        <CountUp value={value} decimals={decimals} />
        {unit && <span className="ml-1 text-xl text-ink-soft">{unit}</span>}
      </p>
    </div>
  );
}

export function TextTile({ label, children, delay = 0 }: { label: string; children: ReactNode; delay?: number }) {
  return (
    <div className="rise tile p-5" style={{ ["--d" as string]: `${delay}ms` }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold">{children}</p>
    </div>
  );
}

/** A playful remark about how much you've played something. */
export function quip(count: number, kind: "track" | "artist"): string {
  if (kind === "track") {
    if (count >= 300) return "It's basically your theme song.";
    if (count >= 100) return "This one lives rent-free in your head.";
    if (count >= 30) return "A certified repeat offender.";
    if (count >= 5) return "You keep coming back to this.";
    return "Just getting acquainted.";
  }
  if (count >= 1000) return "Honestly, you could be in the band.";
  if (count >= 300) return "A true ride-or-die.";
  if (count >= 50) return "Firmly in your rotation.";
  return "A friendly acquaintance.";
}
