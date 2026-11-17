import { iconResponse } from "@/lib/icon-image";

/** 180 px iPhone home-screen icon (opaque background, mark slightly inset). */
export function GET() {
  return iconResponse(180, 0.72);
}
