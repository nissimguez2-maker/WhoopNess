"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { getOwnerRecovery, getOwnerWhoopFeatures } from "@/lib/whoop/sync";
import { ensureSchedule, saveDaySession, loadRecentLogs, saveLog } from "@/lib/plan/store";
import { generateDaySession, type RecentLog } from "@/lib/plan/generate";
import { bandFor, DEFAULT_BODYWEIGHT } from "@/lib/today";
import { todaySlot } from "@/core/schedule";
import { todayKey, todayWeekday } from "@/lib/date";
import { EXERCISE_BY_ID } from "@/core/exercises";
import type { DaySession, LoggedSession, SessionType, WhoopFeatures } from "@/core/types";

export type GenResult = { ok: true; session: DaySession } | { ok: false; error: string };

/** Whole days between an ISO date (YYYY-MM-DD) and today, or undefined. */
function daysAgo(date: string, today: string): number | undefined {
  const a = Date.parse(date + "T00:00:00");
  const b = Date.parse(today + "T00:00:00");
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Training-recency signals derived from the logs (WHOOP can't tell us these). */
function recencyFromLogs(logs: RecentLog[], today: string): Partial<WhoopFeatures> {
  let daysSinceGym: number | undefined;
  let daysSinceSwim: number | undefined;
  let daysSinceLowerBody: number | undefined;
  for (const l of logs) {
    const d = daysAgo(l.date, today);
    if (d == null) continue;
    if (l.type === "gym" && daysSinceGym == null) daysSinceGym = d;
    if (l.type === "swim" && daysSinceSwim == null) daysSinceSwim = d;
    if (daysSinceLowerBody == null && l.exercises.some((e) => e.exerciseId && EXERCISE_BY_ID[e.exerciseId]?.category === "legs")) {
      daysSinceLowerBody = d;
    }
  }
  return { daysSinceGym, daysSinceSwim, daysSinceLowerBody };
}

/** Generate (or regenerate) today's session from live WHOOP + recent logs. */
export async function generateTodaySession(opts?: { fallbackWalk?: boolean }): Promise<GenResult> {
  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    const date = todayKey();

    const schedule = await ensureSchedule(admin, ownerId);
    const slot = todaySlot(schedule, todayWeekday());
    const type: SessionType = slot?.type ?? "gym";

    const [recovery, features, recentLogs, profRes] = await Promise.all([
      getOwnerRecovery(ownerId),
      getOwnerWhoopFeatures(ownerId),
      loadRecentLogs(admin, ownerId, 8),
      admin.from("profile").select("bodyweight_kg").eq("user_id", ownerId).maybeSingle(),
    ]);
    const band = bandFor(recovery) ?? "amber";
    const bodyweightKg = Number(profRes.data?.bodyweight_kg ?? DEFAULT_BODYWEIGHT);
    const recency = recencyFromLogs(recentLogs, date);
    const enrichedFeatures = features ? { ...features, ...recency } : undefined;

    const session = await generateDaySession({
      type,
      band,
      recoveryScore: recovery?.recoveryScore,
      features: enrichedFeatures,
      recentLogs,
      bodyweightKg,
      date,
      fallbackWalk: opts?.fallbackWalk,
      schedule: schedule.map((s) => ({ day: s.day, type: s.type })),
    });
    await saveDaySession(admin, ownerId, session);
    return { ok: true, session };
  } catch {
    return { ok: false, error: "Couldn't build today's session. Try again." };
  }
}

/** Log what was actually done (the checklist) → feeds the next generation. */
export async function logTodaySession(log: LoggedSession): Promise<{ ok: boolean }> {
  try {
    await saveLog(getSupabaseAdmin(), getOwnerId(), log);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
