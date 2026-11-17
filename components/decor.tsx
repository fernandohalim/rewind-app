import type { CSSProperties, ReactNode } from "react";

/* Flat, original illustrations for Rewind. Decorative only (aria-hidden). */

type Svg = { className?: string; style?: CSSProperties };

export function Cassette({ className, style }: Svg) {
  return (
    <svg viewBox="0 0 140 92" className={className} style={style} aria-hidden>
      <rect x="2" y="2" width="136" height="88" rx="12" fill="#E9B44C" stroke="#1B1A17" strokeWidth="3" />
      <rect x="14" y="12" width="112" height="44" rx="8" fill="#FBF6EE" stroke="#1B1A17" strokeWidth="3" />
      <rect x="14" y="12" width="112" height="10" rx="4" fill="#E4572E" />
      <rect x="40" y="28" width="60" height="20" rx="10" fill="#3D2266" />
      <g className="spin-reel">
        <circle cx="50" cy="38" r="7" fill="#FBF6EE" />
        <path d="M50 32v12M44 38h12" stroke="#3D2266" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="spin-reel">
        <circle cx="90" cy="38" r="7" fill="#FBF6EE" />
        <path d="M90 32v12M84 38h12" stroke="#3D2266" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <path d="M30 88l8-20h64l8 20" fill="#D9667E" stroke="#1B1A17" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="54" cy="78" r="3.5" fill="#1B1A17" />
      <circle cx="86" cy="78" r="3.5" fill="#1B1A17" />
    </svg>
  );
}

export function Vinyl({ className, style, label = "#E4572E" }: Svg & { label?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} aria-hidden>
      <circle cx="60" cy="60" r="57" fill="#1B1A17" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#3a3833" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="40" fill="none" stroke="#3a3833" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="32" fill="none" stroke="#3a3833" strokeWidth="1.5" />
      <path d="M24 40a44 44 0 0 1 22-18" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="60" r="20" fill={label} />
      <circle cx="60" cy="60" r="12" fill="none" stroke="#FBF6EE" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="4 5" />
      <circle cx="60" cy="60" r="3.5" fill="#FBF6EE" />
    </svg>
  );
}

export function Headphones({ className, style }: Svg) {
  return (
    <svg viewBox="0 0 120 110" className={className} style={style} aria-hidden>
      <path d="M18 70V58a42 42 0 0 1 84 0v12" fill="none" stroke="#1B1A17" strokeWidth="9" strokeLinecap="round" />
      <path d="M18 70V58a42 42 0 0 1 84 0v12" fill="none" stroke="#2E7D7A" strokeWidth="4" strokeLinecap="round" />
      <rect x="6" y="62" width="28" height="42" rx="12" fill="#E4572E" stroke="#1B1A17" strokeWidth="3" />
      <rect x="86" y="62" width="28" height="42" rx="12" fill="#E4572E" stroke="#1B1A17" strokeWidth="3" />
      <rect x="14" y="72" width="8" height="22" rx="4" fill="#FBF6EE" opacity="0.6" />
      <rect x="94" y="72" width="8" height="22" rx="4" fill="#FBF6EE" opacity="0.6" />
    </svg>
  );
}

export function Note({ className, style, fill = "#E9B44C" }: Svg & { fill?: string }) {
  return (
    <svg viewBox="0 0 60 70" className={className} style={style} aria-hidden>
      <path d="M22 52V12l32-8v38" fill="none" stroke="#1B1A17" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <ellipse cx="14" cy="54" rx="11" ry="9" fill={fill} stroke="#1B1A17" strokeWidth="3.5" />
      <ellipse cx="46" cy="44" rx="11" ry="9" fill={fill} stroke="#1B1A17" strokeWidth="3.5" />
    </svg>
  );
}

export function Sparkle({ className, style, fill = "#FBF6EE" }: Svg & { fill?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden>
      <path d="M20 0c2 11 9 18 20 20-11 2-18 9-20 20-2-11-9-18-20-20C11 18 18 11 20 0z" fill={fill} />
    </svg>
  );
}

export function RewindMark({ className }: Svg) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#E4572E" stroke="#1B1A17" strokeWidth="3" />
      <path d="M23 15 12 24l11 9V15zM36 15l-11 9 11 9V15z" fill="#FBF6EE" stroke="#1B1A17" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The curvy edge where a gradient hero meets the paper below. */
export function Wave({ className, fill = "var(--paper)" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 1440 140" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M0 70C160 130 330 140 520 96S860 10 1060 30s300 90 380 70V140H0z"
        fill={fill}
      />
    </svg>
  );
}

/** Small dots and squares scattered around an icon, like confetti. */
export function Confetti({ colors = ["#E4572E", "#2E7D7A", "#E9B44C", "#7B4B94"] }: { colors?: string[] }) {
  const bits = [
    { top: "-6%", left: "8%", size: 7, round: true },
    { top: "12%", left: "94%", size: 6, round: false },
    { top: "84%", left: "-4%", size: 5, round: false },
    { top: "92%", left: "82%", size: 8, round: true },
    { top: "-10%", left: "70%", size: 4, round: true },
  ];
  return (
    <>
      {bits.map((b, i) => (
        <span
          key={i}
          aria-hidden
          className="twinkle absolute"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: colors[i % colors.length],
            borderRadius: b.round ? 9999 : 2,
            animationDelay: `${i * 0.45}s`,
          }}
        />
      ))}
    </>
  );
}

/** Gradient icon circle with confetti around it. */
export function IconBadge({ from, to, children }: { from: string; to: string; children: ReactNode }) {
  return (
    <div className="relative h-16 w-16 shrink-0">
      <Confetti colors={[from, to, "#E9B44C"]} />
      <div
        className="grid h-16 w-16 place-items-center rounded-full text-white shadow-lg"
        style={{ background: `linear-gradient(140deg, ${from}, ${to})`, boxShadow: `0 12px 24px -8px ${to}` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Loading state: the cassette reels spin while data loads. */
export function LoadingTape({ label = "Rewinding the tape…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-ink-soft" role="status">
      <Cassette className="float-a w-28" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

/** A floating decoration positioned absolutely inside a relative parent. */
export function Floater({
  children,
  className = "",
  rotate = 0,
  variant = "a",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  rotate?: number;
  variant?: "a" | "b";
  delay?: number;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${variant === "a" ? "float-a" : "float-b"} ${className}`}
      style={{ ["--r" as string]: `${rotate}deg`, animationDelay: `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
