import { FieldValue, type WriteBatch } from "firebase-admin/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase/admin";
import type { ArtistDoc, TrackDoc } from "@/lib/entities";
import { playId } from "@/lib/plays/keys";
import type { DayDoc, Play } from "@/lib/plays/types";
import { rebuildMonth, rollup } from "@/lib/stats/rollup";
import { mergeBinges } from "@/lib/stats/streaks";
import type { AllTimeDoc } from "@/lib/stats/types";
import { dayKey, monthOf } from "@/lib/time";
import { artistKey } from "@/lib/plays/keys";

/**
 * Firestore Spark allows 20K writes a day (resets at midnight US Pacific).
 * The import keeps ~3K for the poller and nightly jobs.
 */
export const IMPORT_DAILY_WRITE_CAP = 17_000;
const BATCH_MAX = 450;

// ---------- validation ----------

const PlaySchema = z.object({
  ts: z.number().int().positive(),
  trackId: z.string().regex(/^[A-Za-z0-9]{22}$/),
  artistKey: z.string().min(1).max(320),
  msPlayed: z.number().int().min(0).max(24 * 3_600_000),
  src: z.literal("export"),
  platform: z.string().max(40).optional(),
  skipped: z.boolean().optional(),
  shuffle: z.boolean().optional(),
  reasonStart: z.string().max(40).optional(),
  reasonEnd: z.string().max(40).optional(),
});

export const ChunkBody = z.object({
  importId: z.string().regex(/^exp-\d+-\d+$/),
  cutoff: z.number().int().positive(),
  totalDays: z.number().int().positive().max(20_000),
  days: z
    .array(z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), plays: z.array(PlaySchema).max(5_000) }))
    .min(1)
    .max(400),
  tracks: z.record(
    z.string().regex(/^[A-Za-z0-9]{22}$/),
    z.object({ name: z.string().max(400), artist: z.string().max(400), album: z.string().max(400).optional() }),
  ),
  dryRun: z.boolean().optional(),
});

export const FinishBody = z.object({
  importId: z.string().regex(/^exp-\d+-\d+$/),
  cutoff: z.number().int().positive(),
  binges: z
    .array(z.object({ trackId: z.string(), count: z.number().int(), start: z.number(), end: z.number() }))
    .max(100),
  report: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  dryRun: z.boolean().optional(),
});

// ---------- budget ----------

const pacificDate = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);

/** UTC ms of the next midnight in US Pacific time (when the Spark quota resets). */
export function nextQuotaReset(now = Date.now()): number {
  const [y, m, d] = pacificDate(now).split("-").map(Number);
  for (const offsetHours of [7, 8]) {
    const t = Date.UTC(y, m - 1, d + 1, offsetHours);
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(t));
    if (hour === 0) return t;
  }
  return Date.UTC(y, m - 1, d + 1, 8);
}

export type ImportState = {
  importId?: string;
  cutoff?: number;
  totalDays?: number;
  daysDone?: string[];
  writes?: Record<string, number>; // pacific date -> writes by the importer
  startedAt?: number;
  finishedAt?: number;
  report?: Record<string, unknown>;
};

const stateRef = () => getDb().doc("config/import");

export async function getImportState(): Promise<ImportState> {
  return ((await stateRef().get()).data() ?? {}) as ImportState;
}

export function budget(state: ImportState, now = Date.now()) {
  const used = state.writes?.[pacificDate(now)] ?? 0;
  return { used, cap: IMPORT_DAILY_WRITE_CAP, left: Math.max(0, IMPORT_DAILY_WRITE_CAP - used), resetsAt: nextQuotaReset(now) };
}

// ---------- writes ----------

/** Commit writes in batches of ≤ 450 operations. */
async function commitAll(ops: ((b: WriteBatch) => void)[]) {
  const db = getDb();
  for (let i = 0; i < ops.length; i += BATCH_MAX) {
    const batch = db.batch();
    ops.slice(i, i + BATCH_MAX).forEach((op) => op(batch));
    await batch.commit();
  }
}

export class BudgetError extends Error {
  constructor(public needed: number, public left: number, public resetsAt: number) {
    super("Daily free write quota reached");
  }
}

/**
 * Store one chunk of days. Each day doc is REPLACED by the export's plays,
 * keeping only live-logger plays that ended after the cutoff (the export
 * owns everything up to it). Track and artist stubs are created only when
 * missing, so full Spotify metadata is never downgraded.
 */
export async function writeChunk(body: z.infer<typeof ChunkBody>) {
  const db = getDb();
  const stored = await getImportState();
  const isNewImport = stored.importId !== body.importId;
  let state = stored;
  if (isNewImport) {
    // A new (or different) set of files: start fresh progress.
    state = { importId: body.importId, cutoff: body.cutoff, totalDays: body.totalDays, daysDone: [], writes: state.writes ?? {}, startedAt: Date.now() };
  }
  const done = new Set(state.daysDone ?? []);
  const days = body.days.filter((d) => !done.has(d.day));

  // Reads: existing day docs, tracks and artists in this chunk.
  const dayRefs = days.map((d) => db.doc(`plays/${d.day}`));
  const daySnaps = dayRefs.length ? await db.getAll(...dayRefs) : [];
  const trackIds = [...new Set(days.flatMap((d) => d.plays.map((p) => p.trackId)))];
  const trackSnaps = trackIds.length ? await db.getAll(...trackIds.map((id) => db.doc(`tracks/${id}`))) : [];
  const missingTracks = trackIds.filter((_, i) => !trackSnaps[i].exists);
  const keys = [...new Set(days.flatMap((d) => d.plays.map((p) => p.artistKey)))];
  const artistSnaps = keys.length ? await db.getAll(...keys.map((k) => db.doc(`artists/${k}`))) : [];
  const missingArtists = keys.filter((_, i) => !artistSnaps[i].exists);

  const needed = days.length + missingTracks.length + missingArtists.length + 1;
  const b = budget(state);
  if (needed > b.left) throw new BudgetError(needed, b.left, b.resetsAt);

  let keptApi = 0;
  const ops: ((b: WriteBatch) => void)[] = [];
  days.forEach((d, i) => {
    const existing = (daySnaps[i].data() as DayDoc | undefined)?.items ?? [];
    const liveAfterCutoff = existing.filter((p) => p.src === "api" && p.ts > body.cutoff);
    keptApi += liveAfterCutoff.length;
    const seen = new Set<string>();
    const items = [...(d.plays as Play[]), ...liveAfterCutoff]
      .filter((p) => (seen.has(playId(p)) ? false : (seen.add(playId(p)), true)))
      .sort((a, b2) => a.ts - b2.ts);
    const doc: DayDoc = { day: d.day, items, count: items.length, msTotal: items.reduce((s, p) => s + p.msPlayed, 0) };
    ops.push((batch) => batch.set(dayRefs[i], doc));
  });
  for (const id of missingTracks) {
    const t = body.tracks[id];
    const stub: TrackDoc = {
      name: t?.name ?? "Unknown track",
      artistKey: artistKey(t?.artist),
      artistName: t?.artist ?? "Unknown artist",
      artists: [{ id: null, name: t?.artist ?? "Unknown artist" }],
      album: t?.album ? { name: t.album } : undefined,
      durationMs: 0,
      metaSource: "export-stub",
    };
    ops.push((batch) => batch.set(db.doc(`tracks/${id}`), stub));
  }
  for (const k of missingArtists) {
    const name = Object.values(body.tracks).find((t) => artistKey(t.artist) === k)?.artist ?? k;
    ops.push((batch) => batch.set(db.doc(`artists/${k}`), { name } satisfies ArtistDoc));
  }

  const result = {
    days: days.length,
    skippedAlreadyDone: body.days.length - days.length,
    newTracks: missingTracks.length,
    newArtists: missingArtists.length,
    keptLivePlays: keptApi,
    writes: needed,
    budgetLeft: b.left - needed,
  };
  if (body.dryRun) return { ...result, dryRun: true };

  if (isNewImport) {
    // Different files than the stored progress: reset progress, keep today's write count.
    await stateRef().set({
      importId: body.importId,
      cutoff: body.cutoff,
      totalDays: body.totalDays,
      daysDone: [],
      writes: state.writes ?? {},
      startedAt: Date.now(),
    } satisfies ImportState);
  }
  await commitAll(ops);
  // Progress last, so a failed chunk is simply redone.
  await stateRef().set(
    {
      daysDone: FieldValue.arrayUnion(...days.map((d) => d.day)),
      writes: { [pacificDate(Date.now())]: FieldValue.increment(needed) },
    },
    { merge: true },
  );
  return { ...result, daysDone: done.size + days.length };
}

/**
 * Finish: rebuild every touched month from its day docs (the cutoff month
 * included, so live plays after the cutoff count), merge binges, set
 * exportCutoff LAST, then run the rollup so every page updates now.
 */
export async function finishImport(body: z.infer<typeof FinishBody>) {
  const db = getDb();
  const state = await getImportState();
  const daysDone = state.importId === body.importId ? (state.daysDone ?? []) : [];
  if (!body.dryRun) {
    // Dry runs never record progress, so only real finishes check it.
    if (state.importId !== body.importId) return { ok: false as const, status: 409, error: "No upload in progress for these files." };
    if (daysDone.length < (state.totalDays ?? Infinity)) {
      return { ok: false as const, status: 409, error: `Only ${daysDone.length} of ${state.totalDays} days are uploaded.` };
    }
  }
  const months = [...new Set([...daysDone.map(monthOf), monthOf(dayKey(body.cutoff))])].sort();
  const needed = months.length + 8;
  const b = budget(state);
  if (needed > b.left) throw new BudgetError(needed, b.left, b.resetsAt);
  if (body.dryRun) return { ok: true as const, dryRun: true, months: months.length, writes: needed };

  for (const m of months) await rebuildMonth(m);

  const allTimeRef = db.doc("stats/all-time");
  const prev = ((await allTimeRef.get()).data() ?? {}) as Partial<AllTimeDoc>;
  await allTimeRef.set({ binges: mergeBinges(prev.binges ?? [], body.binges) }, { merge: true });

  await db.doc("config/spotify").set({ exportCutoff: body.cutoff }, { merge: true });
  await stateRef().set(
    { finishedAt: Date.now(), report: body.report, writes: { [pacificDate(Date.now())]: FieldValue.increment(needed) } },
    { merge: true },
  );
  const rolled = await rollup();
  return { ok: true as const, months: months.length, rollup: rolled };
}
