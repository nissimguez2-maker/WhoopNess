import type { SessionType } from "./types";

/**
 * The week is a fixed SCHEDULE — 1 swim + 2 gym — whose days/times the user sets.
 * Exercises are NOT stored here; they're generated on the day from live WHOOP + history.
 */
export interface ScheduleSlot {
  id?: string;
  day: string; // "Sun" … "Sat"
  time: string; // "18:00"
  type: SessionType;
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Default: gym / swim / gym, spaced across the week. */
export const DEFAULT_SCHEDULE: ScheduleSlot[] = [
  { day: "Sun", time: "18:00", type: "gym" },
  { day: "Tue", time: "18:00", type: "swim" },
  { day: "Thu", time: "18:00", type: "gym" },
];

/**
 * Today's scheduled slot, or null if nothing is scheduled today.
 * `todayShort` is the local weekday ("Sun"…"Sat") — pass it from the date helper so
 * the weekday matches the date key (never the server's UTC getDay()).
 */
export function todaySlot(schedule: ScheduleSlot[], todayShort: string = DAYS[new Date().getDay()]!): ScheduleSlot | null {
  return schedule.find((s) => s.day === todayShort) ?? null;
}

export function dayLabel(day: string): string {
  return { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" }[day] ?? day;
}
