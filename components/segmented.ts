/** Shared look for pill toggles (Top board, History "by plays / by minutes"). */
export const segGroup = "flex w-max shrink-0 rounded-full bg-paper-deep p-1";

export function segItem(active: boolean, tone: "vermilion" | "plum" = "plum") {
  const on = tone === "vermilion" ? "bg-vermilion text-ink shadow" : "bg-plum text-white shadow";
  return `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition sm:px-4 ${
    active ? on : "text-ink-soft hover:text-ink"
  }`;
}

/** Chip used for year/month pickers. */
export function chip(active: boolean, small = false) {
  return `shrink-0 whitespace-nowrap rounded-full font-semibold transition ${small ? "px-3 py-1 text-sm" : "px-4 py-1.5"} ${
    active ? "bg-vermilion text-ink shadow" : "bg-paper-deep text-ink-soft hover:text-ink"
  }`;
}
