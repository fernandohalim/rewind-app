import { ViewTransition } from "react";

/**
 * Cover art / artist photo that morphs between list and detail pages
 * (shared-element view transition). `vt` must be unique on a page; pass it
 * only where an entity appears once.
 */
export function Cover({
  src,
  vt,
  round = false,
  className = "",
}: {
  src?: string;
  vt?: string;
  round?: boolean;
  className?: string;
}) {
  const shape = round ? "rounded-full" : "rounded-xl";
  const img = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`shrink-0 object-cover ${shape} ${className}`} />
  ) : (
    <span className={`block shrink-0 bg-paper-deep ${shape} ${className}`} />
  );
  if (!vt) return img;
  return (
    <ViewTransition name={vt} share="morph" default="none">
      {img}
    </ViewTransition>
  );
}

export { vtName } from "@/lib/vt";
