import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DaySession, LoggedSession, SessionType } from "@/core/types";
import { DEFAULT_SCHEDULE, type ScheduleSlot } from "@/core/schedule";
import type { RecentLog } from "./generate";

function weekStart(d = new Date()): string {
  const date = new Date(d);
  date.setDate(date.getDate() - ((date.getDay() + 1) % 7)); // back to Saturday
  return date.toISOString().slice(0, 10);
}

/** A single container weekly_plans row holds the schedule slots (planned_sessions). */
async function ensurePlanContainer(admin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await admin
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.id) return data.id as string;
  const { data: created, error } = await admin
    .from("weekly_plans")
    .insert({ user_id: userId, week_start: weekStart() })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("failed to create plan container");
  return created.id as string;
}

/** Load the weekly schedule (1 swim + 2 gym); create the default if none exists. */
export async function ensureSchedule(admin: SupabaseClient, userId: string): Promise<ScheduleSlot[]> {
  const existing = await loadSchedule(admin, userId);
  if (existing.length > 0) return existing;
  const planId = await ensurePlanContainer(admin, userId);
  await admin.from("planned_sessions").insert(
    DEFAULT_SCHEDULE.map((s) => ({
      plan_id: planId,
      user_id: userId,
      day: s.day,
      slot_time: s.time,
      session_type: s.type,
      focus: s.type === "swim" ? "Swim" : "Gym",
      branches: [],
    })),
  );
  return loadSchedule(admin, userId);
}

export async function loadSchedule(admin: SupabaseClient, userId: string): Promise<ScheduleSlot[]> {
  const { data } = await admin
    .from("planned_sessions")
    .select("id, day, slot_time, session_type")
    .eq("user_id", userId)
    .order("slot_time", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    day: r.day as string,
    time: (r.slot_time as string) ?? "18:00",
    type: (r.session_type as SessionType) ?? "gym",
  }));
}

export async function updateSlot(
  admin: SupabaseClient,
  userId: string,
  id: string,
  patch: { day: string; time: string; type: SessionType },
): Promise<void> {
  await admin
    .from("planned_sessions")
    .update({ day: patch.day, slot_time: patch.time, session_type: patch.type, focus: patch.type === "swim" ? "Swim" : "Gym" })
    .eq("id", id)
    .eq("user_id", userId);
}

// ── Day-of generated session (stored in daily_cards.payload) ─────────────────
export async function loadDaySession(admin: SupabaseClient, userId: string, date: string): Promise<DaySession | null> {
  const { data } = await admin.from("daily_cards").select("payload").eq("user_id", userId).eq("card_date", date).maybeSingle();
  return (data?.payload as DaySession) ?? null;
}

export async function saveDaySession(admin: SupabaseClient, userId: string, session: DaySession): Promise<void> {
  await admin.from("daily_cards").upsert(
    {
      user_id: userId,
      card_date: session.date,
      band: session.band ?? null,
      recovery_score: session.recoveryScore ?? null,
      payload: session,
    },
    { onConflict: "user_id,card_date" },
  );
}

// ── Logs (the checklist → history for the next generation) ───────────────────
export async function saveLog(admin: SupabaseClient, userId: string, log: LoggedSession): Promise<void> {
  await admin.from("session_logs").insert({
    id: randomUUID(),
    user_id: userId,
    status: "done",
    sets: log,
    client_ts: new Date().toISOString(),
  });
}

export async function loadRecentLogs(admin: SupabaseClient, userId: string, n = 6): Promise<RecentLog[]> {
  const { data } = await admin
    .from("session_logs")
    .select("sets, logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(n);
  return (data ?? [])
    .map((r) => r.sets as LoggedSession)
    .filter((s) => s && Array.isArray(s.exercises))
    .map((s) => ({
      date: s.date,
      type: s.type,
      exercises: s.exercises.map((e) => ({ name: e.name, exerciseId: e.exerciseId, weightKg: e.weightKg, reps: e.reps })),
    }));
}
