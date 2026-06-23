import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlannedSession, SessionBranch, WeeklyPlan, WhoopFeatures } from "@/core/types";
import { NISSIM_MEDICAL_PROFILE } from "@/core/exercises";
import { type Slot } from "@/core/planner";
import { generateSmartWeek } from "./generate";

/** Default training slots until the user edits them (3×/week). */
export const DEFAULT_SLOTS: Slot[] = [
  { day: "Sun", minutes: 60, time: "21:00" },
  { day: "Tue", minutes: 60, time: "07:00" },
  { day: "Thu", minutes: 60, time: "21:00" },
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Most recent Saturday (the planning anchor), as YYYY-MM-DD. */
export function currentWeekStart(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun … 6 = Sat
  const back = (day + 1) % 7; // days since last Saturday
  date.setDate(date.getDate() - back);
  return date.toISOString().slice(0, 10);
}

/** Load the latest persisted weekly plan for the owner, or null. */
export async function loadWeeklyPlan(admin: SupabaseClient, userId: string): Promise<WeeklyPlan | null> {
  const { data: planRow } = await admin
    .from("weekly_plans")
    .select("id, week_start, rationale")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!planRow) return null;

  const { data: rows } = await admin
    .from("planned_sessions")
    .select("id, day, slot_time, session_type, focus, branches, rationale")
    .eq("plan_id", planRow.id)
    .order("slot_time", { ascending: true });

  const sessions: PlannedSession[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    day: r.day as string,
    time: (r.slot_time as string) ?? undefined,
    type: (r.session_type as "gym" | "swim") ?? "gym",
    focus: (r.focus as string) ?? "",
    rationale: (r.rationale as string) ?? undefined,
    branches: (r.branches as SessionBranch[]) ?? [],
  }));

  return { weekStart: planRow.week_start as string, rationale: (planRow.rationale as string) ?? undefined, sessions };
}

/** Insert a generated plan + its sessions. */
export async function persistWeeklyPlan(admin: SupabaseClient, userId: string, plan: WeeklyPlan): Promise<void> {
  const { data: planRow, error } = await admin
    .from("weekly_plans")
    .insert({ user_id: userId, week_start: plan.weekStart, rationale: plan.rationale ?? null })
    .select("id")
    .single();
  if (error || !planRow) throw error ?? new Error("failed to insert weekly_plan");

  const sessionRows = plan.sessions.map((s) => ({
    plan_id: planRow.id,
    user_id: userId,
    day: s.day,
    slot_time: s.time ?? null,
    session_type: s.type,
    focus: s.focus,
    branches: s.branches,
    rationale: s.rationale ?? null,
  }));
  await admin.from("planned_sessions").insert(sessionRows);
}

/** Load the plan; if none, generate a smart one (WHOOP-grounded) and persist it. */
export async function ensureWeeklyPlan(
  admin: SupabaseClient,
  userId: string,
  features?: WhoopFeatures,
): Promise<WeeklyPlan> {
  const existing = await loadWeeklyPlan(admin, userId);
  if (existing) return existing;
  const plan = await generateSmartWeek({
    slots: DEFAULT_SLOTS,
    medical: NISSIM_MEDICAL_PROFILE,
    weekStart: currentWeekStart(),
    features,
  });
  await persistWeeklyPlan(admin, userId, plan);
  return (await loadWeeklyPlan(admin, userId)) ?? plan;
}

/** Today's planned session (by weekday), or null if nothing is scheduled today. */
export function getTodaySession(plan: WeeklyPlan, now = new Date()): PlannedSession | null {
  const today = DOW[now.getDay()];
  return plan.sessions.find((s) => s.day === today) ?? null;
}
