"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { NISSIM_MEDICAL_PROFILE } from "@/core/exercises";
import { buildSessionBranches, gymTemplateIdsFor } from "@/core/planner";
import { validatePlan } from "@/core/guardrails";
import type { SessionType, WeeklyPlan } from "@/core/types";

export type UpdateResult = { ok: true } | { ok: false; error: string };

/** Edit a session's day / time / type. On a type change we regenerate its branches. */
export async function updateSession(input: {
  sessionId: string;
  day: string;
  time: string;
  type: SessionType;
}): Promise<UpdateResult> {
  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    const { data: row } = await admin
      .from("planned_sessions")
      .select("id, session_type, focus, branches")
      .eq("id", input.sessionId)
      .eq("user_id", ownerId)
      .maybeSingle();
    if (!row) return { ok: false, error: "Session not found." };

    let branches = row.branches;
    let focus = row.focus as string;

    if (input.type !== row.session_type) {
      if (input.type === "swim") {
        focus = "Swim + upper";
        branches = buildSessionBranches("swim", [], NISSIM_MEDICAL_PROFILE);
      } else {
        focus = typeof focus === "string" && focus.startsWith("Full body") ? focus : "Full body A";
        branches = buildSessionBranches("gym", gymTemplateIdsFor(focus), NISSIM_MEDICAL_PROFILE);
      }
    }

    // Re-validate the single session before persisting (rules dispose).
    const plan: WeeklyPlan = {
      weekStart: "edit",
      sessions: [{ day: input.day, time: input.time, type: input.type, focus, branches }],
    };
    const res = validatePlan(plan, NISSIM_MEDICAL_PROFILE);
    if (!res.ok) return { ok: false, error: res.violations[0]?.reason ?? "Invalid session." };

    const { error } = await admin
      .from("planned_sessions")
      .update({ day: input.day, slot_time: input.time, session_type: input.type, focus, branches })
      .eq("id", input.sessionId)
      .eq("user_id", ownerId);
    if (error) return { ok: false, error: "Could not save." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save." };
  }
}
