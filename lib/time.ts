/**
 * Asia/Jakarta bucketing. Jakarta is UTC+7 all year (no DST), so a fixed
 * offset is exact. Raw timestamps stay in UTC milliseconds everywhere.
 */
export const TZ = "Asia/Jakarta";
const OFFSET_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const local = (ms: number) => new Date(ms + OFFSET_MS); // read with getUTC*

/** "YYYY-MM-DD" in Jakarta time. */
export const dayKey = (ms: number) => local(ms).toISOString().slice(0, 10);
/** "YYYY-MM" in Jakarta time. */
export const monthKey = (ms: number) => dayKey(ms).slice(0, 7);
export const yearOf = (key: string) => key.slice(0, 4);
export const monthOf = (day: string) => day.slice(0, 7);

/** Weekday (Mon = 0 … Sun = 6) and hour in Jakarta time. */
export function dowHour(ms: number): { dow: number; hour: number } {
  const d = local(ms);
  return { dow: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours() };
}

/** Heatmap field name, e.g. "3_14" for Thursday 14:00. */
export const heatKey = (ms: number) => {
  const { dow, hour } = dowHour(ms);
  return `${dow}_${hour}`;
};

/** UTC ms of 00:00 Jakarta on a day key. */
export const dayStartMs = (day: string) => Date.parse(`${day}T00:00:00Z`) - OFFSET_MS;

export const todayKey = () => dayKey(Date.now());

export function addDays(day: string, n: number): string {
  return dayKey(dayStartMs(day) + n * DAY_MS + 1);
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

/** Every day key in a "YYYY-MM" month. */
export function daysInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (month: string, withYear = true) =>
  `${MONTHS[Number(month.slice(5, 7)) - 1]}${withYear ? ` ${month.slice(0, 4)}` : ""}`;
export const dayLabel = (day: string) =>
  `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
