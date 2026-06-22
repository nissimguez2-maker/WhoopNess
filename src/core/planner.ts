import type { Exercise, MedicalProfile, PlannedSession, SessionBranch, WeeklyPlan } from "./types";
import { EXERCISES } from "./exercises";
import { filterAllowedExercises } from "./guardrails";

/**
 * Deterministic weekly plan generator (the "rules" that the LLM later only refines).
 *
 * "The week is the plan, the day is the adjustment." Given the user's available slots,
 * it builds a balanced, knee/back-safe week of full-body sessions. Each session carries
 * three branches — green (primary), amber (lighter), red (recovery) — which ARE the
 * daily autoregulation options the Daily Card selects from by recovery band.
 *
 * Every exercise comes from the guardrail-filtered allowed pool, so the output is safe
 * by construction (and re-checked by validatePlan downstream).
 */

export interface Slot {
  day: string; // e.g. "Sun"
  minutes: number; // available time
  time?: string; // "07:00" | "21:00"
}

/** Three balanced full-body templates (by allowed-exercise id) that rotate across the week. */
const FULL_BODY_TEMPLATES: Array<{ focus: string; ids: string[] }> = [
  { focus: "Full body A", ids: ["leg_press_partial", "chest_press_machine", "lat_pulldown", "cable_lateral_raise", "pallof_press"] },
  { focus: "Full body B", ids: ["romanian_deadlift", "incline_db_press", "chest_supported_row", "cable_triceps_pushdown", "dead_bug"] },
  { focus: "Full body C", ids: ["hip_thrust", "seated_shoulder_press", "face_pull", "incline_db_curl", "standing_calf_raise"] },
];

const RECOVERY_OPTION = "stationary_bike";

function branchesFor(ids: string[], allowed: Set<string>): SessionBranch[] {
  // Keep only allowed ids (safety by construction); fall back if a template id was filtered.
  const safeIds = ids.filter((id) => allowed.has(id));

  const green: SessionBranch = {
    band: "green",
    exercises: safeIds.map((id) => ({ exerciseId: id, sets: 3, reps: "8-10", rpe: 8 })),
  };
  const amber: SessionBranch = {
    band: "amber",
    // Lighter: drop the last accessory, fewer sets, slightly higher reps, lower RPE.
    exercises: safeIds.slice(0, Math.max(3, safeIds.length - 1)).map((id) => ({ exerciseId: id, sets: 2, reps: "10-12", rpe: 7 })),
  };
  const red: SessionBranch = {
    band: "red",
    exercises: allowed.has(RECOVERY_OPTION)
      ? [{ exerciseId: RECOVERY_OPTION, sets: 1, reps: "20 min Z2" }]
      : [],
  };
  return [green, amber, red];
}

export function generateWeeklyPlan(
  slots: Slot[],
  medical: MedicalProfile,
  weekStart: string,
  library: Exercise[] = EXERCISES,
): WeeklyPlan {
  const allowedSet = new Set(filterAllowedExercises(library, medical).map((e) => e.id));

  const sessions: PlannedSession[] = slots.map((slot, i) => {
    const tpl = FULL_BODY_TEMPLATES[i % FULL_BODY_TEMPLATES.length]!;
    return {
      day: slot.day,
      focus: tpl.focus,
      rationale: "Balanced full-body, rotated for even weekly coverage; knee- and back-safe.",
      branches: branchesFor(tpl.ids, allowedSet),
    };
  });

  return { weekStart, sessions };
}

/** Estimate a session's duration (min) from its branch — for the card/plan chips. */
export function estimateDurationMin(branch: SessionBranch): number {
  // ~3.5 min per set incl. rest, + warmup; bike/recovery handled by its rep label.
  const totalSets = branch.exercises.reduce((n, e) => n + e.sets, 0);
  if (branch.band === "red") return 20;
  return Math.max(20, 8 + totalSets * 3.5) | 0;
}
