import type { DaySession, ExerciseCategory, PrescribedExercise, RecoveryBand, SessionType } from "./types";
import { EXERCISES, EXERCISE_BY_ID, SWIM_COMPANION_IDS, WARMUP, COOLDOWN } from "./exercises";
import { proteinTargetG } from "./protein";

/**
 * Deterministic day-of session builder — the safe fallback the LLM refines.
 * Picks ONLY from the approved library, spreads categories, tunes volume to the
 * recovery band, and (for swim) places companions BEFORE the swim.
 */

function poolByCategory(cat: ExerciseCategory, excludeCardio = true): string[] {
  return EXERCISES.filter(
    (e) => e.category === cat && e.id !== "swimming" && e.id !== "city_walk" && (!excludeCardio || e.category !== "cardio"),
  ).map((e) => e.id);
}

const GYM_POOLS: Record<"push" | "pull" | "legs" | "core", string[]> = {
  push: poolByCategory("push"),
  pull: poolByCategory("pull"),
  legs: poolByCategory("legs"),
  core: poolByCategory("core"),
};

function repsFor(band: RecoveryBand): string {
  return band === "green" ? "8-12" : band === "amber" ? "10-12" : "12-15";
}
function setsFor(band: RecoveryBand): number {
  return band === "red" ? 2 : 3;
}
function swimMinFor(band: RecoveryBand): number {
  return band === "green" ? 25 : band === "amber" ? 20 : 15;
}

export function presc(id: string, band: RecoveryBand, opts: { loadKg?: number; durationMin?: number } = {}): PrescribedExercise {
  const ex = EXERCISE_BY_ID[id]!;
  if (ex.isDuration) {
    return {
      exerciseId: id,
      name: ex.name,
      category: ex.category,
      sets: 1,
      reps: "—",
      durationMin: opts.durationMin ?? (band === "green" ? 15 : 10),
      cues: ex.cues ?? [],
    };
  }
  return {
    exerciseId: id,
    name: ex.name,
    category: ex.category,
    sets: setsFor(band),
    reps: repsFor(band),
    restSec: ex.defaultRestSec,
    loadKg: opts.loadKg,
    cues: ex.cues ?? [],
  };
}

function pick(pool: string[], recent: Set<string>): string {
  return pool.find((id) => !recent.has(id)) ?? pool[0]!;
}

/** Gym session: push · pull · legs · (2nd push/pull) · core, varied from recent. */
export function buildGymExercises(band: RecoveryBand, recentIds: Set<string> = new Set(), lastLoads: Record<string, number> = {}): PrescribedExercise[] {
  const used = new Set(recentIds);
  const order: Array<keyof typeof GYM_POOLS> = band === "red" ? ["push", "pull", "legs", "core"] : ["push", "pull", "legs", "pull", "core"];
  const out: PrescribedExercise[] = [];
  for (const cat of order) {
    const id = pick(GYM_POOLS[cat], used);
    used.add(id);
    out.push(presc(id, band, { loadKg: lastLoads[id] }));
  }
  return out;
}

/** Swim session: companions FIRST (you're wet after), then the swim. */
export function buildSwimExercises(band: RecoveryBand, recentIds: Set<string> = new Set(), lastLoads: Record<string, number> = {}): PrescribedExercise[] {
  const companions = SWIM_COMPANION_IDS.filter((id) => EXERCISE_BY_ID[id]);
  const used = new Set(recentIds);
  const n = band === "green" ? 2 : band === "amber" ? 1 : 1;
  const chosen: string[] = [];
  // Prefer the bodyweight strength companions, then bike/walk.
  for (const id of ["pull_ups", "push_ups", "exercise_bike", "treadmill_walk"]) {
    if (chosen.length >= n) break;
    if (companions.includes(id) && !used.has(id)) {
      chosen.push(id);
      used.add(id);
    }
  }
  const pre = chosen.map((id) => presc(id, band, { loadKg: lastLoads[id], durationMin: 8 }));
  return [...pre, presc("swimming", band, { durationMin: swimMinFor(band) })];
}

export function buildWalkExercises(): PrescribedExercise[] {
  return [presc("city_walk", "amber", { durationMin: 60 })];
}

export interface BuildDayOpts {
  recoveryScore?: number;
  recentIds?: Set<string>;
  lastLoads?: Record<string, number>;
  bodyweightKg?: number;
  rationale?: string;
  fallbackWalk?: boolean;
}

export function buildDaySession(type: SessionType, band: RecoveryBand, date: string, opts: BuildDayOpts = {}): DaySession {
  const isSwim = type === "swim";
  const exercises = opts.fallbackWalk
    ? buildWalkExercises()
    : isSwim
      ? buildSwimExercises(band, opts.recentIds, opts.lastLoads)
      : buildGymExercises(band, opts.recentIds, opts.lastLoads);

  const kind = opts.fallbackWalk ? "swim" : isSwim ? "swim" : "gym";
  return {
    date,
    type,
    recoveryScore: opts.recoveryScore,
    band,
    warmup: opts.fallbackWalk ? ["Easy first few minutes to warm up.", "Loosen hips and ankles before picking up the pace."] : [...WARMUP[kind]],
    exercises,
    cooldown: opts.fallbackWalk ? ["Ease off the last few minutes.", "Gentle calf, quad and hip stretch when you finish."] : [...COOLDOWN[kind]],
    rationale:
      opts.rationale ??
      `${opts.fallbackWalk ? "Gym/pool wasn't on today — a brisk hour walk keeps the streak and is easy on the knee." : isSwim ? "Swim day: a little strength on land first, then low-impact laps." : "Balanced gym day across push, pull, legs and core, tuned to today's recovery."}`,
    proteinTargetG: proteinTargetG(opts.bodyweightKg ?? 78),
    isFallbackWalk: opts.fallbackWalk,
  };
}

/** Rough session length (min) for a chip. */
export function estimateSessionMin(session: DaySession): number {
  const dur = session.exercises.reduce((n, e) => n + (e.durationMin ?? 0), 0);
  const sets = session.exercises.filter((e) => !e.durationMin).reduce((n, e) => n + e.sets, 0);
  return Math.max(20, Math.round(10 + dur + sets * 3.5));
}
