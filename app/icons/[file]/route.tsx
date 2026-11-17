import { iconResponse } from "@/lib/icon-image";

const ICONS: Record<string, { size: number; inset: number }> = {
  "icon-192.png": { size: 192, inset: 0.78 },
  "icon-512.png": { size: 512, inset: 0.78 },
  "maskable-512.png": { size: 512, inset: 0.62 }, // inside the 80% safe zone
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const icon = ICONS[(await params).file];
  if (!icon) return new Response("Not found", { status: 404 });
  return iconResponse(icon.size, icon.inset);
}
