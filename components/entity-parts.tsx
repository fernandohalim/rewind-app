import type { ReactNode } from "react";
import { CountUp } from "./count-up";

/** Grid for a row of stat tiles: 2 across on phones, 4 from md up. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{children}</div>;
}

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
    <div className="rise tile min-w-0 p-4 sm:p-5" style={{ ["--d" as string]: `${delay}ms` }}>
      <p className="eyebrow truncate">{label}</p>
      <p className="font-display tabular mt-1 truncate text-3xl font-bold sm:text-4xl">
        <CountUp value={value} decimals={decimals} />
        {unit && <span className="ml-1 text-lg text-ink-soft sm:text-xl">{unit}</span>}
      </p>
    </div>
  );
}

export function TextTile({
  label,
  children,
  note,
  delay = 0,
}: {
  label: string;
  children: ReactNode;
  note?: ReactNode;
  delay?: number;
}) {
  return (
    <div className="rise tile min-w-0 p-4 sm:p-5" style={{ ["--d" as string]: `${delay}ms` }}>
      <p className="eyebrow truncate">{label}</p>
      <p className="font-display mt-1 truncate text-2xl font-bold sm:mt-2">{children}</p>
      {note && <p className="mt-0.5 truncate text-sm text-ink-soft">{note}</p>}
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
