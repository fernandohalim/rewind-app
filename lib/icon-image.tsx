import { ImageResponse } from "next/og";

/** The Rewind mark (double chevron in a vermilion circle) as an SVG data URI. */
const MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#E4572E" stroke="#1B1A17" stroke-width="3"/><path d="M23 15 12 24l11 9V15zM36 15l-11 9 11 9V15z" fill="#FBF6EE" stroke="#1B1A17" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
)}`;

/**
 * PNG app icon. `inset` is the share of the canvas the mark may use: maskable
 * icons keep it inside the centre 80% safe zone (we use 62% for margin).
 */
export function iconResponse(size: number, inset = 0.78) {
  const mark = Math.round(size * inset);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4EFE6",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={MARK} width={mark} height={mark} />
      </div>
    ),
    { width: size, height: size },
  );
}
