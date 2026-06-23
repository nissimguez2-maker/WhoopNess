import type {
  Exercise,
  MedicalProfile,
  PlannedExercise,
  PlannedSession,
  SessionBranch,
  SessionType,
  WeeklyPlan,
} from "./types";
import { EXERCISES, EXERCISE_BY_ID } from "./exercises";
import { filterAllowedExercises } from "./guardrails";

/**
 * Deterministic weekly plan generator (the "rules" the LLM later refines).
 *
 * "The week is the plan, the day is the adjustment." Each session is typed GYM or
 * SWIM — never both. A SWIM session may only contain swim + push-up / pull-up /
 * walk / bike. Each session carries three branches — green (primary), amber
 * (lighter), red (recovery) — which ARE the daily autoregulation options.
 *
 * Everything comes from the guardrail-filtered allowed pool, so output is safe by
 * construction (and re-checked by validatePlan downstream).
 */

export interface Slot {
  day: string; // e.g. "Sun"
  minutes: number;
  time?: string; // "07:00" | "21:00"
}

/** Five-movement full-body gym templates that rotate across the week. */
const GYM_TEMPLATES: Array<{ focus: string; ids: string[] }> = [
  { focus: "Full body A", ids: ["leg_press_partial", "chest_press_machine", "lat_pulldown", "cable_lateral_raise", "pallof_press"] },
  { focus: "Full body B", ids: ["romanian_deadlift", "incline_db_press", "chest_supported_row", "cable_triceps_pushdown", "dead_bug"] },
  { focus: "Full body C", ids: ["hip_thrust", "seated_shoulder_press", "face_pull", "incline_db_curl", "standing_calf_raise"] },
];

/** Swim companions (only these may accompany a swim). */
const SWIM_COMPANIONS = ["push_up", "pull_up", "stationary_bike", "walking"];

function planned(id: string, over: Partial<PlannedExercise> = {}): PlannedExercise {
  const ex = EXERCISE_BY_ID[id];
  if (ex?.isDuration) {
    return { exerciseId: id, sets: 1, reps: "—", durationMin: 20, restSec: ex.defaultRestSec, ...over };
  }
  return { exerciseId: id, sets: 3, reps: "8-10", rpe: 8, restSec: ex?.defaultRestSec, ...over };
}

function gymBranches(ids: string[], allowed: Set<string>): SessionBranch[] {
  const safe = ids.filter((id) => allowed.has(id));
  return [
    { band: "green", exercises: safe.map((id) => planned(id, { sets: 3, reps: "8-10", rpe: 8 })) },
    {
      band: "amber",
      exercises: safe.slice(0, Math.max(3, safe.length - 1)).map((id) => planned(id, { sets: 2, reps: "10-12", rpe: 7 })),
    },
    { band: "red", exercises: allowed.has("stationary_bike") ? [planned("stationary_bike", { durationMin: 20 })] : [] },
  ];
}

function swimBranches(allowed: Set<string>): SessionBranch[] {
  const has = (id: string) => allowed.has(id);
  const companions = SWIM_COMPANIONS.filter(has);
  const upper = companions.filter((id) => id === "push_up" || id === "pull_up");
  return [
    {
      band: "green",
      exercises: [
        planned("swim_easy", { durationMin: 25, reps: "easy-moderate" }),
        ...upper.map((id) => planned(id, { sets: 3, reps: id === "push_up" ? "10-15" : "5-8" })),
      ],
    },
    {
      band: "amber",
      exercises: [
        planned("swim_easy", { durationMin: 20, reps: "easy" }),
        ...upper.slice(0, 1).map((id) => planned(id, { sets: 2, reps: "10-12" })),
      ],
    },
    {
      band: "red",
      exercises: has("walking")
        ? [planned("walking", { durationMin: 25, reps: "brisk" })]
        : [planned("swim_easy", { durationMin: 15, reps: "very easy" })],
    },
  ];
}

/** Build the green/amber/red branches for a session of a given type. Reused on type-switch. */
export function buildSessionBranches(
  type: SessionType,
  templateIds: string[],
  medical: MedicalProfile,
  library: Exercise[] = EXERCISES,
): SessionBranch[] {
  const allowed = new Set(filterAllowedExercises(library, medical).map((e) => e.id));
  return type === "swim" ? swimBranches(allowed) : gymBranches(templateIds, allowed);
}

/** Default varied gym/swim ordering for N sessions (2 gym + 1 swim, swim in the middle). */
export function defaultMix(n: number): SessionType[] {
  const out: SessionType[] = [];
  for (let i = 0; i < n; i++) out.push(i === Math.floor(n / 2) ? "swim" : "gym");
  return out;
}

export interface GenerateOpts {
  /** Session type per slot. Defaults to a varied 2-gym/1-swim pattern. */
  mix?: SessionType[];
  rationale?: string;
}

export function generateWeeklyPlan(
  slots: Slot[],
  medical: MedicalProfile,
  weekStart: string,
  opts: GenerateOpts = {},
  library: Exercise[] = EXERCISES,
): WeeklyPlan {
  const allowed = new Set(filterAllowedExercises(library, medical).map((e) => e.id));
  const mix = opts.mix ?? defaultMix(slots.length);

  let gymIdx = 0;
  const sessions: PlannedSession[] = slots.map((slot, i) => {
    const type = mix[i] ?? "gym";
    if (type === "swim") {
      return {
        day: slot.day,
        time: slot.time,
        type,
        focus: "Swim + upper",
        rationale: "Low-impact conditioning + upper-body — kind to the knee, full-body in the water.",
        branches: swimBranches(allowed),
      };
    }
    const tpl = GYM_TEMPLATES[gymIdx % GYM_TEMPLATES.length]!;
    gymIdx++;
    return {
      day: slot.day,
      time: slot.time,
      type,
      focus: tpl.focus,
      rationale: "Balanced full-body, rotated for even weekly coverage; knee- and back-safe.",
      branches: gymBranches(tpl.ids, allowed),
    };
  });

  return { weekStart, sessions, rationale: opts.rationale };
}

/** Estimate a session branch's duration (min) for chips. */
export function estimateDurationMin(branch: SessionBranch): number {
  if (branch.band === "red") return 20;
  const durationTotal = branch.exercises.reduce((n, e) => n + (e.durationMin ?? 0), 0);
  const strengthSets = branch.exercises.filter((e) => !e.durationMin).reduce((n, e) => n + e.sets, 0);
  const est = durationTotal + (strengthSets > 0 ? 8 + strengthSets * 3.5 : 0);
  return Math.max(20, Math.round(est));
}

/** Template ids for a gym focus label (so a type-switch back to gym can rebuild it). */
export function gymTemplateIdsFor(focus: string): string[] {
  return (GYM_TEMPLATES.find((t) => t.focus === focus) ?? GYM_TEMPLATES[0]!).ids;
}
