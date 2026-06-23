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
  | "posterior_chain"
  /** May appear in a SWIM session (swim + push-up/pull-up/walk/bike only). */
  | "swim_eligible";

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

export type Equipment = "machine" | "cable" | "barbell" | "dumbbell" | "bodyweight" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  /** Primary muscle group trained. */
  primaryMuscle: MuscleGroup;
  /** Secondary groups (counted at a fraction in volume). */
  secondaryMuscles?: MuscleGroup[];
  /** Movement/loading tags the guardrail engine reasons about. */
  tags: ExerciseTag[];
  equipment: Equipment;
  /** True if this is part of the conservative knee-safe fallback template. */
  fallbackSafe?: boolean;
  /** 1–3 sentence how-to, plain imperative voice. */
  instructions?: string;
  /** Short form cues (2–4), e.g. "Brace core", "Knees track toes". */
  cues?: string[];
  /** Default rest between sets, seconds (strength ~120, accessory ~60). */
  defaultRestSec?: number;
  /** True for cardio/conditioning measured in time, not reps. */
  isDuration?: boolean;
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
/** A workout is exactly ONE of these. Swim sessions never contain gym work. */
export type SessionType = "gym" | "swim";

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string; // e.g. "8-10" or "10/side"
  loadKg?: number;
  rpe?: number;
  /** Overrides Exercise.defaultRestSec for this slot, seconds. */
  restSec?: number;
  /** Cardio/swim: prescribed minutes instead of sets×reps. */
  durationMin?: number;
}

export interface SessionBranch {
  band: RecoveryBand;
  exercises: PlannedExercise[];
}

export interface PlannedSession {
  /** Persisted id (planned_sessions.id) when loaded from the DB. */
  id?: string;
  day: string; // e.g. "Mon"
  /** "07:00" | "21:00" | … */
  time?: string;
  type: SessionType;
  focus: string;
  /** Primary (green) + alternative branches (amber, red). */
  branches: SessionBranch[];
  rationale?: string;
}

export interface WeeklyPlan {
  weekStart: string; // ISO date (Saturday-planned)
  sessions: PlannedSession[];
  /** The coach's "why this week", citing WHOOP numbers + volume. */
  rationale?: string;
}

/** Result of validating a generated plan against the medical guardrails + invariants. */
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

// ── View model (what the UI renders for one exercise) ────────────────────────
export interface ExerciseView {
  id: string;
  name: string;
  equipment: Equipment;
  primaryMuscle: MuscleGroup;
  isDuration: boolean;
  /** Pre-formatted collapsed line, e.g. "3 × 8–10 · 60 kg" or "20 min · Z2". */
  quick: string;
  sets?: number;
  reps?: string;
  loadKg?: number;
  durationMin?: number;
  restSec?: number;
  rpe?: number;
  instructions?: string;
  cues?: string[];
}

// ── WHOOP-derived features for the smart planner ─────────────────────────────
export interface WhoopFeatures {
  /** Most recent recovery score, 0–100. */
  latestRecovery?: number;
  /** Trailing 7-day mean recovery. */
  recovery7dMean?: number;
  /** Recovery slope over the window: + improving, − declining. */
  recoverySlope?: number;
  /** HRV baseline (mean) and its standard deviation, ms. */
  hrvBaseline?: number;
  hrvSd?: number;
  /** Today's HRV deviation from baseline, in SDs. */
  hrvDeviationSd?: number;
  rhrBaseline?: number;
  /** Trailing 7-day mean sleep performance %, and sleep debt (h). */
  sleep7dMean?: number;
  /** Acute (7d) vs chronic (28d) strain ratio — ACWR-like fatigue signal. */
  acwr?: number;
  /** Days since last logged gym / lower-body / swim session. */
  daysSinceGym?: number;
  daysSinceLowerBody?: number;
  daysSinceSwim?: number;
  /** Coarse fatigue state derived from the above. */
  fatigueState: "fresh" | "normal" | "strained";
}
