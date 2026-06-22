import type { RecoveryBand } from "./types";

/**
 * Fueling targets — maintenance recomposition, whole-food kosher, protein-floor-first.
 * Targets + timing only (the chosen depth); the user picks the actual foods.
 *
 * The protein floor is the priority lever for rebuilding muscle while coming off a
 * GLP-1 (Mounjaro). As appetite returns during the taper, we point it at protein.
 */

export type TaperStage = "on" | "tapering" | "off";

export interface FuelingInputs {
  bodyweightKg: number;
  /** Coarse activity for the day, drives the calorie/carb sizing. */
  band: RecoveryBand;
  taper: TaperStage;
  isTrainingDay: boolean;
}

export interface FuelingTargets {
  proteinG: number;
  calories: number;
  /** Pre-session carb suggestion (g), 0 on rest days. */
  preCarbG: number;
  hydrationNote: string;
  proteinFloorNote: string;
}

/**
 * Protein target: 1.6–2.2 g/kg for muscle retention/gain. We anchor on the higher
 * end (≈2.0 g/kg) given active recomposition + GLP-1 muscle-loss risk.
 */
export function proteinTargetG(bodyweightKg: number): number {
  return Math.round(bodyweightKg * 2.0);
}

/**
 * Maintenance calories (recomposition): a simple, transparent estimate.
 * Uses a bodyweight-based maintenance multiplier; training days get a small bump.
 * This is intentionally conservative and explainable — not a precise TDEE model.
 */
export function maintenanceCalories(bodyweightKg: number, isTrainingDay: boolean): number {
  // ~31 kcal/kg maintenance for a moderately active recomposition baseline.
  const base = bodyweightKg * 31;
  const bump = isTrainingDay ? bodyweightKg * 2 : 0;
  return Math.round((base + bump) / 10) * 10;
}

export function fuelingTargets(input: FuelingInputs): FuelingTargets {
  const proteinG = proteinTargetG(input.bodyweightKg);
  const calories = maintenanceCalories(input.bodyweightKg, input.isTrainingDay);

  // Carbs around the session scale with intent: more on green, less on amber, none on red/rest.
  let preCarbG = 0;
  if (input.isTrainingDay) {
    preCarbG = input.band === "green" ? 40 : input.band === "amber" ? 30 : 0;
  }

  const proteinFloorNote =
    input.taper === "tapering"
      ? `Hit ${proteinG}g protein before anything else — as your appetite returns off Mounjaro, point it at protein, not just calories.`
      : `Protein floor: ${proteinG}g. Whole-food kosher sources first.`;

  return {
    proteinG,
    calories,
    preCarbG,
    hydrationNote: "Hydrate well today (uric-acid history) — aim for pale-straw urine.",
    proteinFloorNote,
  };
}
