/**
 * One local-day source of truth. The app is for one person in one timezone, so we
 * resolve "today" (date key AND weekday) in that fixed zone — never UTC. This fixes
 * the evening-trainee bug where a session saved under a UTC date vanished on reload.
 */
const TZ = process.env.APP_TZ || "Asia/Jerusalem";

/** Local calendar date as YYYY-MM-DD (e.g. "2026-06-23"). */
export function todayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Local weekday short name matching schedule DAYS ("Sun" … "Sat"). */
export function todayWeekday(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
}

/** Human header date, e.g. "Tue 23 Jun" in the app's timezone. */
export function todayLabel(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
}
