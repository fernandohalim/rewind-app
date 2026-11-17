import type { NamedRow } from "@/lib/stats/read";
import { SpotifyLink } from "./spotify";

const fmtMin = (ms: number) => `${Math.round(ms / 60000).toLocaleString("en")} min`;

/** A ranked list with a thin value bar per row. */
export function RankList({
  title,
  rows,
  by,
  round = false,
}: {
  title: string;
  rows: NamedRow[];
  by: "count" | "ms";
  round?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => (by === "count" ? r.count : r.ms)));
  return (
    <div className="tile p-5 sm:p-6">
      <h3 className="font-display text-2xl font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Nothing played in this period yet.</p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {rows.map((r, i) => {
            const v = by === "count" ? r.count : r.ms;
            return (
              <li key={r.id} className="rise flex items-center gap-3" style={{ ["--d" as string]: `${i * 30}ms` }}>
                <span className="font-display tabular w-6 text-right text-lg font-bold text-ink/70">{i + 1}</span>
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className={`h-10 w-10 shrink-0 object-cover ${round ? "rounded-full" : "rounded-lg"}`} />
                ) : (
                  <span className={`h-10 w-10 shrink-0 bg-paper-deep ${round ? "rounded-full" : "rounded-lg"}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="tabular shrink-0 text-sm font-semibold text-ink-soft">
                      {by === "count" ? `${r.count.toLocaleString("en")} plays` : fmtMin(r.ms)}
                    </p>
                  </div>
                  {r.sub && <p className="truncate text-xs text-ink-soft">{r.sub}</p>}
                  <div className="mt-1 h-1.5 rounded-full bg-paper-deep">
                    <div className="h-1.5 rounded-full bg-vermilion" style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                </div>
                <SpotifyLink href={r.url} />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function StatTile({ label, value, unit, delay = 0 }: { label: string; value: string; unit?: string; delay?: number }) {
  return (
    <div className="rise tile p-5" style={{ ["--d" as string]: `${delay}ms` }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="font-display tabular mt-1 text-4xl font-bold">
        {value}
        {unit && <span className="ml-1 text-xl text-ink-soft">{unit}</span>}
      </p>
    </div>
  );
}
