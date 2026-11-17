"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install Rewind": uses `beforeinstallprompt` on Chrome/Edge; on iPhone and
 * iPad shows a Share → Add to Home Screen hint. Hidden once installed.
 */
export function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    // Browser capability checks only run on the client, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(standalone);
    setIos(isIos && !standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;

  return (
    <div className="relative">
      <button
        onClick={async () => {
          if (evt) {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
          } else {
            setHint((h) => !h);
          }
        }}
        className="wiggle-hover rounded-full bg-vermilion px-4 py-2 text-sm font-bold text-ink shadow-[3px_3px_0_var(--ink)]"
        style={{ rotate: "-2deg" }}
      >
        ⏪ Install Rewind
      </button>
      {hint && (
        <div role="status" className="absolute bottom-full right-0 mb-3 w-64 rounded-2xl bg-ink p-4 text-sm text-white shadow-xl">
          Tap <span className="font-bold">Share</span> <span aria-hidden>⬆️</span>, then{" "}
          <span className="font-bold">Add to Home Screen</span>. You&apos;ll log in once more inside the app.
        </div>
      )}
    </div>
  );
}
