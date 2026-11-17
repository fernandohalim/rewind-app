import type { MetadataRoute } from "next";

/** Install-only PWA: no offline mode, no push. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rewind",
    short_name: "Rewind",
    description: "Your listening, played back.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4EFE6",
    theme_color: "#F4EFE6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
