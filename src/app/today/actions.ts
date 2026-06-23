"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { getOwnerRecovery, getOwnerWhoopFeatures } from "@/lib/whoop/sync";
import { ensureSchedule, saveDaySession, loadRecentLogs, saveLog } from "@/lib/plan/store";
import { generateDaySession } from "@/lib/plan/generate";
import { bandFor, DEFAULT_BODYWEIGHT } from "@/lib/today";
import { todaySlot } from "@/core/schedule";
import type { DaySession, LoggedSession, SessionType } from "@/core/types";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type GenResult = { ok: true; session: DaySession } | { ok: false; error: string };

/** Generate (or regenerate) today's session from live WHOOP + recent logs. */
export async function generateTodaySession(opts?: { fallbackWalk?: boolean }): Promise<GenResult> {
  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    const date = todayDate();

    const schedule = await ensureSchedule(admin, ownerId);
    const slot = todaySlot(schedule);
    const type: SessionType = slot?.type ?? "gym";

    const [recovery, features, recentLogs, profRes] = await Promise.all([
      getOwnerRecovery(ownerId),
      getOwnerWhoopFeatures(ownerId),
      loadRecentLogs(admin, ownerId, 6),
      admin.from("profile").select("bodyweight_kg").eq("user_id", ownerId).maybeSingle(),
    ]);
    const band = bandFor(recovery) ?? "amber";
    const bodyweightKg = Number(profRes.data?.bodyweight_kg ?? DEFAULT_BODYWEIGHT);

    const session = await generateDaySession({
      type,
      band,
      recoveryScore: recovery?.recoveryScore,
      features,
      recentLogs,
      bodyweightKg,
      date,
      fallbackWalk: opts?.fallbackWalk,
    });
    await saveDaySession(admin, ownerId, session);
    return { ok: true, session };
  } catch {
    return { ok: false, error: "Couldn't generate today's session. Try again." };
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
