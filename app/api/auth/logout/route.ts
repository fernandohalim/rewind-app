import { redirectTo } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/session";

export function POST() {
  const res = redirectTo("/login", 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
