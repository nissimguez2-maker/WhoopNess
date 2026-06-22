import { NISSIM_MEDICAL_PROFILE, EXERCISE_BY_ID } from "@/core/exercises";
import { selectBand, selectBranch, VERDICT } from "@/core/recovery";
import { fuelingTargets } from "@/core/fueling";
import type { PlannedSession, RecoveryReading, MedicalProfile } from "@/core/types";

/**
 * Mock data so the UI renders end-to-end before WHOOP/Supabase are wired.
 * Everything here flows through the REAL core logic (band selection, fueling,
 * guardrail-safe exercises) — only the inputs are stubbed.
 */

export const MOCK_RECOVERY: RecoveryReading = {
  recoveryScore: 48,
  hrvMs: 38,
  restingHr: 58,
  spo2: 97,
  skinTempC: 33.4,
};

const MOCK_SLEEP = { hours: 6.2, performancePct: 78 };
const MOCK_YESTERDAY_STRAIN = 13.2;
const BODYWEIGHT_KG = 78;

/** A knee/back-safe full-body session with green/amber/red branches. */
export const MOCK_SESSION: PlannedSession = {
  day: "Tue",
  focus: "Full body A",
  rationale: "Balanced push/pull/hinge, knee- and back-safe.",
  branches: [
    {
      band: "green",
      exercises: [
        { exerciseId: "leg_press_partial", sets: 3, reps: "8-10", loadKg: 120, rpe: 8 },
        { exerciseId: "chest_press_machine", sets: 3, reps: "8-10", loadKg: 60, rpe: 8 },
        { exerciseId: "chest_supported_row", sets: 3, reps: "10-12", loadKg: 55, rpe: 8 },
        { exerciseId: "cable_lateral_raise", sets: 3, reps: "12-15", loadKg: 10, rpe: 9 },
        { exerciseId: "pallof_press", sets: 3, reps: "10/side", rpe: 7 },
      ],
    },
    {
      band: "amber",
      exercises: [
        { exerciseId: "leg_press_partial", sets: 2, reps: "10-12", loadKg: 105, rpe: 7 },
        { exerciseId: "chest_press_machine", sets: 2, reps: "10-12", loadKg: 55, rpe: 7 },
        { exerciseId: "chest_supported_row", sets: 2, reps: "12", loadKg: 50, rpe: 7 },
        { exerciseId: "pallof_press", sets: 2, reps: "10/side", rpe: 6 },
      ],
    },
    {
      band: "red",
      exercises: [{ exerciseId: "stationary_bike", sets: 1, reps: "20 min Z2" }],
    },
  ],
};

export interface TodayCard {
  recoveryScore: number;
  band: "green" | "amber" | "red";
  verdictWord: string;
  verdictTone: string;
  focus: string;
  durationMin: number;
  exercises: Array<{ name: string; detail: string }>;
  fuel: { calories: number; proteinG: number; preCarbG: number; proteinFloorNote: string; hydrationNote: string };
  why: string[];
  watchouts: string[];
}

/** Assemble today's card through the real core logic. */
export function buildTodayCard(
  recovery: RecoveryReading = MOCK_RECOVERY,
  medical: MedicalProfile = NISSIM_MEDICAL_PROFILE,
): TodayCard {
  const band = selectBand(recovery, "standard");
  const branch = selectBranch(MOCK_SESSION.branches, band)!;
  const verdict = VERDICT[band];
  const fuel = fuelingTargets({ bodyweightKg: BODYWEIGHT_KG, band, taper: "tapering", isTrainingDay: band !== "red" });

  const exercises = branch.exercises.map((pe) => {
    const ex = EXERCISE_BY_ID[pe.exerciseId];
    const load = pe.loadKg ? ` @ ${pe.loadKg}kg` : "";
    return { name: ex?.name ?? pe.exerciseId, detail: `${pe.sets} × ${pe.reps}${load}` };
  });

  const why = [
    `Recovery ${recovery.recoveryScore}% — ${band.toUpperCase()} band (standard thresholds: green ≥67 / amber 34–66 / red ≤33).`,
    `HRV ${recovery.hrvMs} ms, resting HR ${recovery.restingHr} bpm; slept ${MOCK_SLEEP.hours} h (${MOCK_SLEEP.performancePct}% performance).`,
    `Yesterday's strain ${MOCK_YESTERDAY_STRAIN} → today is the ${band === "green" ? "primary" : band === "amber" ? "lighter" : "recovery"} branch.`,
  ];

  const watchouts = [
    "Knee braces on (both knees). No deep knee flexion or loaded leg extension.",
    "Hinge/press: brace the core, keep the spine neutral (scoliosis).",
  ];

  return {
    recoveryScore: recovery.recoveryScore,
    band,
    verdictWord: verdict.word,
    verdictTone: verdict.tone,
    focus: MOCK_SESSION.focus,
    durationMin: band === "red" ? 20 : band === "amber" ? 35 : 50,
    exercises,
    fuel: {
      calories: fuel.calories,
      proteinG: fuel.proteinG,
      preCarbG: fuel.preCarbG,
      proteinFloorNote: fuel.proteinFloorNote,
      hydrationNote: fuel.hydrationNote,
    },
    why,
    watchouts,
  };
}
