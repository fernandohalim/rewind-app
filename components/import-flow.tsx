"use client";

import { unzipSync } from "fflate";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { chunkDays, parseExport, type ExportRow, type ParsedExport } from "@/lib/import/parse";
import { dayLabel } from "@/lib/time";
import { ConfettiBurst } from "./confetti-burst";
import { Cassette } from "./decor";

type Status = {
  importId: string | null;
  totalDays: number;
  daysDone: string[];
  finishedAt: number | null;
  budget: { used: number; cap: number; left: number; resetsAt: number };
};

type Phase =
  | { kind: "pick" }
  | { kind: "reading"; note: string }
  | { kind: "ready" }
  | { kind: "uploading"; done: number; total: number }
  | { kind: "paused"; resetsAt: number; done: number; total: number }
  | { kind: "finishing" }
  | { kind: "done"; months: number }
  | { kind: "error"; message: string };

const HISTORY_FILE = /(Streaming_History_Audio|endsong)[^/]*\.json$/i;

const fmtTime = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(ms);

/** Read zips and JSON files into arrays of rows (only the audio history files). */
async function readFiles(files: File[]): Promise<{ rows: ExportRow[][]; names: string[] }> {
  const rows: ExportRow[][] = [];
  const names: string[] = [];
  const dec = new TextDecoder();
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      const entries = unzipSync(new Uint8Array(await f.arrayBuffer()), { filter: (e) => HISTORY_FILE.test(e.name) });
      for (const [name, data] of Object.entries(entries)) {
        rows.push(JSON.parse(dec.decode(data)));
        names.push(name.split(/[\\/]/).pop()!); // zips made on Windows use backslashes
      }
    } else if (/\.json$/i.test(f.name)) {
      if (/Video/i.test(f.name)) continue; // video history is skipped
      const parsed = JSON.parse(await f.text());
      if (Array.isArray(parsed)) {
        rows.push(parsed);
        names.push(f.name);
      }
    }
  }
  return { rows, names };
}

export function ImportFlow() {
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const [data, setData] = useState<ParsedExport | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // ?dry=1 runs every read and check without writing anything (for testing).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDryRun(new URLSearchParams(window.location.search).get("dry") === "1");
    fetch("/api/import/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Status | null) => s && setStatus(s))
      .catch(() => {});
  }, []);

  const onFiles = useCallback(async (list: FileList | File[]) => {
    const files = [...list];
    if (!files.length) return;
    setPhase({ kind: "reading", note: `Unpacking ${files.length === 1 ? files[0].name : `${files.length} files`}…` });
    try {
      await new Promise((r) => setTimeout(r, 30)); // let the UI paint first
      const { rows, names } = await readFiles(files);
      if (!rows.length) throw new Error("No Streaming_History_Audio_*.json files found. Pick the zip from Spotify or the JSON files inside it.");
      setPhase({ kind: "reading", note: `Reading ${names.length} history files…` });
      await new Promise((r) => setTimeout(r, 30));
      const parsed = parseExport(rows);
      if (!parsed.days.length) throw new Error("These files don't contain any music plays.");
      setFileNames(names);
      setData(parsed);
      const s = (await fetch("/api/import/status").then((r) => (r.ok ? r.json() : null))) as Status | null;
      if (s) setStatus(s);
      setPhase({ kind: "ready" });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const resumable = !!(data && status && status.importId === data.importId && !status.finishedAt);
  const doneDays = new Set(resumable ? status!.daysDone : []);
  const remainingDays = data ? data.days.filter((d) => !doneDays.has(d.day)) : [];
  const estWrites = data ? remainingDays.length + Math.min(data.report.uniqueTracks, remainingDays.length * 10) + data.report.uniqueArtists : 0;

  async function start() {
    if (!data) return;
    const chunks = chunkDays(remainingDays);
    const total = data.days.length;
    let done = total - remainingDays.length;
    setPhase({ kind: "uploading", done, total });
    for (const chunk of chunks) {
      const ids = new Set(chunk.flatMap((d) => d.plays.map((p) => p.trackId)));
      const tracks = Object.fromEntries([...ids].map((id) => [id, data.tracks[id]]));
      let attempt = 0;
      for (;;) {
        const res = await fetch("/api/import/chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importId: data.importId, cutoff: data.cutoff, totalDays: total, days: chunk, tracks, dryRun }),
        });
        if (res.status === 429) {
          const b = await res.json();
          setPhase({ kind: "paused", resetsAt: b.resetsAt, done, total });
          return;
        }
        if (res.ok) break;
        if (++attempt >= 3) {
          const msg = await res.text();
          setPhase({ kind: "error", message: `Upload failed (${res.status}). ${msg.slice(0, 200)}` });
          return;
        }
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
      done += chunk.length;
      setPhase({ kind: "uploading", done, total });
    }
    await finish();
  }

  async function finish() {
    if (!data) return;
    setPhase({ kind: "finishing" });
    const res = await fetch("/api/import/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importId: data.importId, cutoff: data.cutoff, binges: data.binges, report: data.report, dryRun }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      setPhase({ kind: "paused", resetsAt: body.resetsAt, done: data.days.length, total: data.days.length });
      return;
    }
    if (!res.ok) {
      setPhase({ kind: "error", message: body.error ?? `Finishing failed (${res.status}).` });
      return;
    }
    setPhase({ kind: "done", months: body.months ?? 0 });
  }

  const r = data?.report;

  return (
    <div className="space-y-6">
      {dryRun && (
        <p className="rounded-2xl bg-mustard px-4 py-2 text-sm font-bold text-ink">
          Dry run: everything is read and checked, nothing is written.
        </p>
      )}

      {(phase.kind === "pick" || phase.kind === "error") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`tile flex flex-col items-center gap-4 border-4 border-dashed p-6 sm:p-10 text-center transition ${
            dragOver ? "scale-[1.01] border-vermilion bg-[#FFF3EC]" : "border-transparent"
          }`}
        >
          <Cassette className={`w-28 ${dragOver ? "" : "float-a"}`} />
          <p className="font-display text-2xl font-bold">Drop your Spotify export here</p>
          <p className="max-w-md text-ink-soft">
            The <code className="rounded bg-paper-deep px-1.5">my_spotify_data.zip</code> from Spotify, or the{" "}
            <code className="rounded bg-paper-deep px-1.5">Streaming_History_Audio_*.json</code> files inside it. Files are
            read in your browser; only cleaned-up plays are uploaded.
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-vermilion px-6 py-3 font-bold text-ink shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
          >
            Choose files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,.json,application/zip,application/json"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && onFiles(e.target.files)}
          />
          {phase.kind === "error" && <p className="rounded-2xl bg-[#FDE3DA] px-4 py-3 text-sm font-semibold text-vermilion-deep">{phase.message}</p>}
          {status?.finishedAt && (
            <p className="text-sm text-ink-soft">
              Your last import finished on {new Date(status.finishedAt).toLocaleDateString("en-GB")}. Importing a newer
              export replaces everything up to its last play.
            </p>
          )}
        </div>
      )}

      {phase.kind === "reading" && (
        <div className="tile flex flex-col items-center gap-3 p-6 sm:p-10">
          <Cassette className="float-a w-24" />
          <p className="font-semibold">{phase.note}</p>
        </div>
      )}

      {r && data && phase.kind !== "pick" && phase.kind !== "reading" && phase.kind !== "error" && (
        <section className="tile p-5 sm:p-6">
          <h2 className="font-display text-2xl font-bold">What&apos;s in your export</h2>
          <p className="mt-1 text-sm text-ink-soft">{fileNames.length} files · {fileNames.slice(0, 3).join(", ")}{fileNames.length > 3 ? "…" : ""}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Music plays" value={r.kept.toLocaleString("en")} />
            <Stat label="Hours" value={Math.round(r.hours).toLocaleString("en")} />
            <Stat label="Tracks" value={r.uniqueTracks.toLocaleString("en")} />
            <Stat label="Artists" value={r.uniqueArtists.toLocaleString("en")} />
          </dl>
          <p className="mt-4 text-sm text-ink-soft">
            {r.firstDay && r.lastDay ? `${dayLabel(r.firstDay)} → ${dayLabel(r.lastDay)} · ${data.days.length.toLocaleString("en")} days. ` : ""}
            Skipped: {r.skippedPodcastOrVideo.toLocaleString("en")} podcast/video, {r.skippedIncognito.toLocaleString("en")} incognito,{" "}
            {(r.skippedNoMetadata + r.skippedLocalOrBad).toLocaleString("en")} without track info, out of {r.rows.toLocaleString("en")} rows.
          </p>
        </section>
      )}

      {phase.kind === "ready" && data && (
        <section className="tile p-5 sm:p-6">
          {resumable && doneDays.size > 0 ? (
            <p className="font-semibold">
              Welcome back: {doneDays.size.toLocaleString("en")} of {data.days.length.toLocaleString("en")} days are already in. Let&apos;s
              finish the rest.
            </p>
          ) : (
            <p className="font-semibold">Ready to import {data.days.length.toLocaleString("en")} days of listening.</p>
          )}
          {status && (
            <p className="mt-2 text-sm text-ink-soft">
              Up to about {estWrites.toLocaleString("en")} database writes; {status.budget.left.toLocaleString("en")} free today.{" "}
              {estWrites > status.budget.left
                ? `It will pause when today's free quota runs out and continue after ${fmtTime(status.budget.resetsAt)} (Jakarta).`
                : "It should finish in one go."}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={start}
              className="rounded-full bg-vermilion px-6 py-3 font-bold text-ink shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
            >
              {resumable && doneDays.size > 0 ? (remainingDays.length ? "Continue import" : "Finish import") : "Start import"}
            </button>
            <button onClick={() => { setData(null); setPhase({ kind: "pick" }); }} className="rounded-full bg-paper-deep px-5 py-3 font-semibold">
              Pick other files
            </button>
          </div>
        </section>
      )}

      {(phase.kind === "uploading" || phase.kind === "paused") && (
        <section className="tile p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-xl font-bold">{phase.kind === "paused" ? "Paused for today" : "Uploading…"}</p>
            <p className="tabular text-sm font-semibold text-ink-soft">
              {phase.done.toLocaleString("en")} / {phase.total.toLocaleString("en")} days
            </p>
          </div>
          <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-deep">
            <div
              className="h-full rounded-full bg-[repeating-linear-gradient(90deg,#E4572E_0_10px,#E98A3D_10px_20px)] transition-[width] duration-500"
              style={{ width: `${(phase.done / Math.max(1, phase.total)) * 100}%` }}
            />
          </div>
          {phase.kind === "paused" ? (
            <p className="mt-4 text-ink-soft">
              Today&apos;s free database quota is used up, and your progress is saved. Come back after{" "}
              <span className="font-bold text-ink">{fmtTime(phase.resetsAt)}</span> (Jakarta), open this page, pick the same files
              and press <span className="font-bold text-ink">Continue import</span>.
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">Keep this tab open. You can watch the tape roll.</p>
          )}
        </section>
      )}

      {phase.kind === "finishing" && (
        <div className="tile flex flex-col items-center gap-3 p-6 sm:p-10 text-center">
          <Cassette className="float-a w-24" />
          <p className="font-semibold">Rebuilding your months and stats… this can take a minute or two.</p>
        </div>
      )}

      {phase.kind === "done" && (
        <section className="tile relative overflow-hidden p-6 text-center sm:p-8">
          <ConfettiBurst fireKey="import-done" />
          <p className="font-display text-3xl font-bold sm:text-4xl">Your whole history is in!</p>
          <p className="mt-2 text-ink-soft">
            {dryRun
              ? `Dry run finished: ${phase.months} ${phase.months === 1 ? "month" : "months"} would be rebuilt. Nothing was written.`
              : `${phase.months} ${phase.months === 1 ? "month" : "months"} rebuilt. Every page now covers your full history.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/history" className="rounded-full bg-vermilion px-6 py-3 font-bold text-ink shadow-[3px_3px_0_var(--ink)]">
              Rewind the tape
            </Link>
            <Link href="/habits" className="rounded-full bg-paper-deep px-6 py-3 font-semibold">
              See your habits
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="font-display tabular text-2xl font-bold">{value}</dd>
    </div>
  );
}
