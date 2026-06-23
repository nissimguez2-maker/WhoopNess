import type { MuscleGroup } from "./types";

/**
 * Curated, versioned evidence base. This is what makes the coach "smart" without
 * outsourcing safety to the LLM: the deterministic budget + the planner prompt both
 * draw on these values. Sources are guideline-/literature-derived (ACSM resistance
 * training guidance; Schoenfeld/Israetel hypertrophy volume landmarks; JOSPT/MOON
 * patellofemoral + ACL rehab principles; GLP-1 lean-mass-retention literature).
 *
 * Treat as config: versioned, reviewed. Bump EVIDENCE_VERSION on change.
 */
export const EVIDENCE_VERSION = "2026-06-22";

/** Weekly hard-set landmarks per muscle (sets/week). MEV=minimum effective, MAV=adaptive, MRV=max recoverable. */
export interface VolumeLandmark {
  mev: number;
  mav: number;
  mrv: number;
}

export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmark> = {
  chest: { mev: 8, mav: 14, mrv: 20 },
  back: { mev: 10, mav: 16, mrv: 22 },
  shoulders: { mev: 8, mav: 16, mrv: 22 },
  biceps: { mev: 6, mav: 12, mrv: 18 },
  triceps: { mev: 6, mav: 12, mrv: 18 },
  quads: { mev: 8, mav: 12, mrv: 18 },
  hamstrings_glutes: { mev: 8, mav: 14, mrv: 18 },
  calves: { mev: 6, mav: 12, mrv: 16 },
  core: { mev: 6, mav: 12, mrv: 18 },
};

/** Train each major muscle at least this many times per week (frequency for hypertrophy). */
export const TARGET_FREQUENCY_PER_WEEK = 2;

/** Minimum hours between heavy lower-body / knee-loading sessions (joint recovery). */
export const MIN_HOURS_BETWEEN_LOWER_BODY = 48;

/** Hypertrophy rep/intensity guidance. */
export const REP_RANGES = {
  compound: "6-10",
  accessory: "10-15",
  core: "10-15",
} as const;

/**
 * Autoregulation: map a recovery/fatigue picture to how hard the week should lean.
 * Returns a multiplier applied to the per-muscle MAV target (clamped to [MEV, MRV]).
 */
export function volumeBiasFor(input: {
  recovery7dMean?: number;
  recoverySlope?: number;
  acwr?: number;
  fatigueState: "fresh" | "normal" | "strained";
}): number {
  let bias = 1.0; // start at MAV
  if (input.fatigueState === "strained") bias -= 0.25;
  if (input.fatigueState === "fresh") bias += 0.1;
  if (input.recoverySlope != null && input.recoverySlope < 0) bias -= 0.1;
  if (input.recoverySlope != null && input.recoverySlope > 0) bias += 0.05;
  if (input.acwr != null && input.acwr > 1.5) bias -= 0.15; // spiking acute load
  if (input.recovery7dMean != null && input.recovery7dMean < 45) bias -= 0.1;
  return clamp(bias, 0.6, 1.15);
}

/**
 * Choose the gym/swim mix for the week from the fatigue picture. 3 sessions total.
 * More swim (low-impact active recovery) when strained / recovery declining.
 */
export function gymSwimMix(input: {
  recovery7dMean?: number;
  recoverySlope?: number;
  acwr?: number;
  fatigueState: "fresh" | "normal" | "strained";
}): { gym: number; swim: number } {
  const strained =
    input.fatigueState === "strained" ||
    (input.acwr != null && input.acwr > 1.5) ||
    (input.recovery7dMean != null && input.recovery7dMean < 45) ||
    (input.recoverySlope != null && input.recoverySlope < -1.5);
  if (strained) return { gym: 1, swim: 2 };
  if (input.fatigueState === "fresh") return { gym: 2, swim: 1 };
  return { gym: 2, swim: 1 };
}

/** Short evidence notes injected into the planner prompt (kept terse). */
export const EVIDENCE_NOTES: string[] = [
  "Hypertrophy: ~10–20 hard sets/muscle/week, each muscle trained ≥2×/week, mostly 6–15 reps near failure (RPE 7–9).",
  "Autoregulation: WHOOP recovery is a fatigue/illness brake — bias volume DOWN toward MEV when recovery is low/declining or acute strain is spiking; push toward MAV only when well-recovered.",
  "Knee (patellofemoral defect, post-MPFL): avoid deep loaded knee flexion, full-ROM loaded leg extension, lunges, impact/running. Favor partial-ROM leg press, hip thrust, RDL, hamstring curl, calf, cycling, swimming. Keep ≥48h between heavy lower-body sessions.",
  "Spine (mild scoliosis + back pain): symmetric/supported loading, strong anti-rotation core, posterior chain; build axial load gradually; avoid heavy spinal compression.",
  "Swim sessions: easy–moderate laps as low-impact conditioning/active recovery; may add only push-ups, pull-ups, walking or bike — no gym machine work.",
  "GLP-1 taper (Mounjaro): protect lean mass — keep protein high (~2 g/kg) and training intensity meaningful even in a calorie-neutral phase; returning appetite should go to protein first.",
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
