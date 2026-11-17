/** Spotify attribution: wherever cover art or track info appears, link back with the Spotify icon. */
export function SpotifyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1ED760" />
      <path
        d="M6.2 9.2c3.9-1.2 8.3-.8 11.6 1.1M6.8 12.3c3.2-.9 6.8-.6 9.5 1M7.4 15.2c2.6-.7 5.2-.4 7.3.8"
        fill="none"
        stroke="#000"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SpotifyLink({ href, label = "Open in Spotify" }: { href?: string; label?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:scale-110 hover:bg-paper-deep"
    >
      <SpotifyIcon />
    </a>
  );
}
