import type { MuscleGroup } from "./types";
import { EXERCISE_BY_ID } from "./exercises";

/**
 * Strength, volume, and "harmony" metrics — the scoreboard that replaces the scale.
 * Leads with strength/volume (the chosen #1 metric); bodyweight is contextualized elsewhere.
 */

/** Estimated 1-rep-max via the Epley formula. Confidence degrades above ~12 reps. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return round1(weightKg * (1 + reps / 30));
}

export interface LoggedSet {
  exerciseId: string;
  weightKg?: number;
  reps?: number;
  /** Whether the set was performed (for quick-log: done/skipped). */
  done: boolean;
}

/** Tonnage volume for a set (weight × reps). Falls back to 0 when weight isn't logged. */
export function setVolume(s: LoggedSet): number {
  if (!s.done || !s.weightKg || !s.reps) return 0;
  return s.weightKg * s.reps;
}

/** Count of "hard sets" performed (the literature's standard volume proxy when load isn't logged). */
export function hardSetCount(sets: LoggedSet[]): number {
  return sets.filter((s) => s.done).length;
}

/**
 * Per-muscle weekly hard-set count, mapping each exercise to its primary (1.0)
 * and secondary (0.5) groups. Used for the harmony balance score and volume charts.
 */
export function weeklySetsByMuscle(sets: LoggedSet[]): Record<MuscleGroup, number> {
  const totals = emptyMuscleMap();
  for (const s of sets) {
    if (!s.done) continue;
    const ex = EXERCISE_BY_ID[s.exerciseId];
    if (!ex) continue;
    totals[ex.primaryMuscle] += 1;
    for (const m of ex.secondaryMuscles ?? []) totals[m] += 0.5;
  }
  return totals;
}

/** Default target share of weekly sets per muscle group (sums to 1). Tunable per goal. */
export const DEFAULT_TARGET_SHARES: Record<MuscleGroup, number> = {
  back: 0.18,
  quads: 0.13,
  hamstrings_glutes: 0.14,
  chest: 0.12,
  shoulders: 0.12,
  biceps: 0.08,
  triceps: 0.08,
  calves: 0.07,
  core: 0.08,
};

export interface HarmonyResult {
  /** 0–100 balance score: 100 = perfectly matches target distribution. */
  score: number;
  /** Muscle group furthest BELOW its target share (the thing to add), if any. */
  lagging?: MuscleGroup;
  shares: Record<MuscleGroup, number>;
}

/**
 * Harmony balance score from the weekly per-muscle distribution.
 * score = (1 − ½·Σ|actualShare − targetShare|) × 100  (1 minus total-variation distance).
 * Symmetric, bounded 0–100, intuitive. Reflects what he TRAINS, not yet what he looks like.
 */
export function harmonyScore(
  setsByMuscle: Record<MuscleGroup, number>,
  targets: Record<MuscleGroup, number> = DEFAULT_TARGET_SHARES,
): HarmonyResult {
  const total = Object.values(setsByMuscle).reduce((a, b) => a + b, 0);
  const shares = emptyMuscleMap();
  if (total === 0) {
    return { score: 0, shares };
  }
  let tvd = 0;
  let lagging: MuscleGroup | undefined;
  let worstGap = 0;
  for (const m of MUSCLES) {
    shares[m] = setsByMuscle[m] / total;
    const gap = shares[m] - targets[m]; // negative = under-trained
    tvd += Math.abs(gap);
    if (gap < worstGap) {
      worstGap = gap;
      lagging = m;
    }
  }
  const score = Math.round((1 - tvd / 2) * 100);
  return { score: clamp(score, 0, 100), lagging, shares };
}

// ── internals ────────────────────────────────────────────────────────────────
const MUSCLES: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings_glutes",
  "calves",
  "core",
];

function emptyMuscleMap(): Record<MuscleGroup, number> {
  return {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    quads: 0,
    hamstrings_glutes: 0,
    calves: 0,
    core: 0,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
