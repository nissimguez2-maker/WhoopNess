/**
 * Core domain types for WhoopNess. Framework-agnostic, no I/O.
 * These describe the "rules dispose" layer: recovery, guardrails, planning, metrics.
 */

// ── Recovery / autoregulation ──────────────────────────────────────────────
export type RecoveryBand = "green" | "amber" | "red";

export interface RecoveryReading {
  /** WHOOP recovery score, 0–100. */
  recoveryScore: number;
  /** HRV (rmssd), milliseconds. */
  hrvMs?: number;
  /** Resting heart rate, bpm. */
  restingHr?: number;
  /** SpO2 percentage. */
  spo2?: number;
  /** Skin temperature, °C. */
  skinTempC?: number;
}

// ── Medical constraints / guardrails ───────────────────────────────────────
/** Movement / loading properties an exercise can have, used by the guardrail engine. */
export type ExerciseTag =
  | "deep_knee_flexion"
  | "loaded_full_rom_knee_extension"
  | "high_impact"
  | "running"
  | "jumping_plyometric"
  | "deep_lunge"
  | "heavy_axial_load"
  | "ballistic_spinal"
  | "low_impact"
  | "machine_supported"
  | "knee_safe"
  | "core_stability"
  | "posterior_chain";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings_glutes"
  | "calves"
  | "core";

export interface Exercise {
  id: string;
  name: string;
  /** Primary muscle group trained. */
  primaryMuscle: MuscleGroup;
  /** Secondary groups (counted at a fraction in volume). */
  secondaryMuscles?: MuscleGroup[];
  /** Movement/loading tags the guardrail engine reasons about. */
  tags: ExerciseTag[];
  equipment: "machine" | "cable" | "barbell" | "dumbbell" | "bodyweight" | "cardio";
  /** True if this is part of the conservative knee-safe fallback template. */
  fallbackSafe?: boolean;
}

/** A single hard rule: any exercise carrying one of `blockedTags` is contraindicated. */
export interface HardConstraint {
  id: string;
  label: string;
  blockedTags: ExerciseTag[];
}

export interface MedicalProfile {
  hard: HardConstraint[];
  /** Advisory notes surfaced to the user / coach, never used to block. */
  advisories: string[];
  /** Max load progression per week, as a fraction (e.g. 0.1 = 10%). */
  maxWeeklyLoadProgression: number;
}

// ── Planning ───────────────────────────────────────────────────────────────
export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string; // e.g. "8-10"
  loadKg?: number;
  rpe?: number;
}

export interface SessionBranch {
  band: RecoveryBand;
  exercises: PlannedExercise[];
}

export interface PlannedSession {
  day: string; // e.g. "Mon"
  focus: string;
  /** Primary (green) + alternative branches (amber, red). */
  branches: SessionBranch[];
  rationale?: string;
}

export interface WeeklyPlan {
  weekStart: string; // ISO date (Saturday-planned)
  sessions: PlannedSession[];
}

/** Result of validating a generated plan against the medical guardrails. */
export interface ValidationResult {
  ok: boolean;
  violations: Array<{
    sessionDay: string;
    band: RecoveryBand;
    exerciseId: string;
    constraintId: string;
    reason: string;
  }>;
}

// ── Red-flag escalation ──────────────────────────────────────────────────────
export interface RedFlagResult {
  escalate: boolean;
  reasons: string[];
}
