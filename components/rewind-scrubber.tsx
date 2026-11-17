"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Dir = 1 | -1;

const PAUSE = "M6 5h4v14H6zM14 5h4v14h-4z";
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);

/**
 * The Rewind scrubber: a tape-style slider that plays your months forward or
 * backward. Reels spin while it plays (the other way when rewinding).
 */
export function RewindScrubber({
  labels,
  index,
  onIndex,
  speedMs = 900,
}: {
  labels: string[];
  index: number;
  onIndex: (i: number) => void;
  speedMs?: number;
}) {
  const [playing, setPlaying] = useState<Dir | null>(null);
  const reduced = useReducedMotion();
  const idx = useRef(index);
  useEffect(() => {
    idx.current = index;
  }, [index]);
  const last = labels.length - 1;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const next = idx.current + playing;
      if (next < 0 || next > last) {
        setPlaying(null);
        return;
      }
      onIndex(next);
    }, speedMs);
    return () => clearInterval(t);
  }, [playing, last, onIndex, speedMs]);

  const play = (dir: Dir) => {
    if (playing === dir) return setPlaying(null);
    // Starting from the end (or start) rewinds to the other side first.
    if (dir === 1 && index >= last) onIndex(0);
    if (dir === -1 && index <= 0) onIndex(last);
    setPlaying(dir);
  };

  const reel = (
    <svg
      viewBox="0 0 40 40"
      className="h-11 w-11 shrink-0"
      style={{
        animation: playing && !reduced ? `spin ${playing === 1 ? 1.2 : 0.7}s linear infinite ${playing === -1 ? "reverse" : ""}` : undefined,
      }}
      aria-hidden
    >
      {/* tape wound on the reel, hub, and three spokes */}
      <circle cx="20" cy="20" r="18" fill="#3D2266" />
      <circle cx="20" cy="20" r="11" fill="#FBF6EE" stroke="#1B1A17" strokeWidth="2" />
      {[0, 120, 240].map((a) => (
        <rect key={a} x="18.5" y="9.5" width="3" height="6" rx="1.5" fill="#1B1A17" transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="3" fill="#1B1A17" />
    </svg>
  );

  const btn = "grid h-10 w-10 place-items-center rounded-full bg-white text-plum-deep shadow transition hover:scale-110 active:scale-95";

  return (
    <div className="rounded-[28px] border-2 border-ink bg-mustard p-3 shadow-[4px_4px_0_var(--ink)] sm:p-4">
      <div className="flex items-center gap-3 rounded-2xl bg-[#FBF6EE] px-3 py-2">
        {reel}
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-vermilion-deep">Now playing</p>
          <p className="font-display tabular truncate text-2xl font-bold">{labels[index] ?? "–"}</p>
        </div>
        {reel}
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, last)}
        value={index}
        onChange={(e) => {
          setPlaying(null);
          onIndex(Number(e.target.value));
        }}
        aria-label="Month"
        aria-valuetext={labels[index]}
        className="tape-range mt-3 w-full"
      />

      <div className="mt-2 flex items-center justify-center gap-2">
        <button className={btn} onClick={() => { setPlaying(null); onIndex(0); }} aria-label="Jump to the first month">
          <Icon d="M6 5h2v14H6zM20 5v14L9 12z" />
        </button>
        <button className={`${btn} ${playing === -1 ? "!bg-vermilion !text-ink" : ""}`} onClick={() => play(-1)} aria-label={playing === -1 ? "Pause" : "Rewind through the months"}>
          <Icon d={playing === -1 ? PAUSE : "M12 5v14L3 12zM21 5v14l-9-7z"} />
        </button>
        <button className={`${btn} h-12 w-12 ${playing === 1 ? "!bg-vermilion !text-ink" : ""}`} onClick={() => play(1)} aria-label={playing === 1 ? "Pause" : "Play through the months"}>
          <Icon d={playing === 1 ? PAUSE : "M7 4v16l13-8z"} />
        </button>
        <button className={btn} onClick={() => { setPlaying(null); onIndex(last); }} aria-label="Jump to the latest month">
          <Icon d="M16 5h2v14h-2zM4 5v14l11-7z" />
        </button>
      </div>
    </div>
  );
}
