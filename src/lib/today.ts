import type { ExerciseView, PlannedExercise, PlannedSession, RecoveryBand, RecoveryReading, SessionType } from "@/core/types";
import { EXERCISE_BY_ID, NISSIM_MEDICAL_PROFILE } from "@/core/exercises";
import { selectBand, selectBranch, VERDICT } from "@/core/recovery";
import { estimateDurationMin } from "@/core/planner";
import { fuelingTargets, type TaperStage } from "@/core/fueling";

export interface TodayCard {
  recoveryScore: number;
  band: RecoveryBand;
  verdictWord: string;
  verdictTone: string;
  sessionType: SessionType;
  focus: string;
  durationMin: number;
  exercises: ExerciseView[];
  fuel: { calories: number; proteinG: number; preCarbG: number; proteinFloorNote: string; hydrationNote: string };
  why: string[];
  watchouts: string[];
}

export type CardState =
  | { kind: "no-connection" }
  | { kind: "awaiting-recovery"; focus?: string; type?: SessionType }
  | { kind: "rest-day" }
  | { kind: "ready"; data: TodayCard };

export interface OwnerProfile {
  bodyweightKg: number;
  taper: TaperStage;
}

const DEFAULT_PROFILE: OwnerProfile = { bodyweightKg: 78, taper: "tapering" };

/** Map planned exercises to the UI view-model (shared by Today + Week). */
export function toExerciseViews(exercises: PlannedExercise[]): ExerciseView[] {
  return exercises.map(toView);
}

function toView(pe: PlannedExercise): ExerciseView {
  const ex = EXERCISE_BY_ID[pe.exerciseId];
  const isDuration = Boolean(ex?.isDuration || pe.durationMin != null);
  const quick = isDuration
    ? `${pe.durationMin ?? 20} min${pe.reps && pe.reps !== "—" ? ` · ${pe.reps}` : ""}`
    : `${pe.sets} × ${pe.reps}${pe.loadKg ? ` · ${pe.loadKg} kg` : ""}`;
  return {
    id: pe.exerciseId,
    name: ex?.name ?? pe.exerciseId,
    equipment: ex?.equipment ?? "machine",
    primaryMuscle: ex?.primaryMuscle ?? "core",
    isDuration,
    quick,
    sets: isDuration ? undefined : pe.sets,
    reps: pe.reps && pe.reps !== "—" ? pe.reps : undefined,
    loadKg: pe.loadKg,
    durationMin: isDuration ? pe.durationMin ?? 20 : undefined,
    restSec: pe.restSec ?? ex?.defaultRestSec,
    rpe: pe.rpe,
    instructions: ex?.instructions,
    cues: ex?.cues,
  };
}

/**
 * Build the honest Today state from live inputs. Never fabricates a band:
 * - no WHOOP token → "no-connection"
 * - connected but no recovery posted yet → "awaiting-recovery"
 * - no session scheduled today → "rest-day"
 * - otherwise → "ready" with the recovery-selected branch.
 */
export function buildTodayCardState(input: {
  whoopConnected: boolean;
  recovery: RecoveryReading | null;
  session: PlannedSession | null;
  profile?: OwnerProfile;
}): CardState {
  if (!input.whoopConnected) return { kind: "no-connection" };
  if (!input.session) return { kind: "rest-day" };
  if (!input.recovery) return { kind: "awaiting-recovery", focus: input.session.focus, type: input.session.type };

  const profile = input.profile ?? DEFAULT_PROFILE;
  const band = selectBand(input.recovery, "standard");
  const branch = selectBranch(input.session.branches, band)!;
  const verdict = VERDICT[band];
  const isTrainingDay = band !== "red";
  const fuel = fuelingTargets({ bodyweightKg: profile.bodyweightKg, band, taper: profile.taper, isTrainingDay });

  const exercises = (branch?.exercises ?? []).map(toView);

  const why = [
    `Recovery ${input.recovery.recoveryScore}% → ${band.toUpperCase()} band (green ≥67 / amber 34–66 / red ≤33).`,
    input.recovery.hrvMs != null && input.recovery.restingHr != null
      ? `HRV ${Math.round(input.recovery.hrvMs)} ms, resting HR ${input.recovery.restingHr} bpm.`
      : "Today's branch is selected from your morning recovery.",
    `Today is the ${band === "green" ? "primary" : band === "amber" ? "lighter" : "recovery"} branch of "${input.session.focus}".`,
  ];
  if (input.session.rationale) why.push(input.session.rationale);

  const watchouts =
    input.session.type === "swim"
      ? ["No knee brace needed in the water — easy on the joint.", "Keep effort easy-to-moderate; it's conditioning, not a race."]
      : ["Knee braces on (both knees). No deep knee flexion or loaded leg extension.", "Brace the core and keep a neutral spine on hinges/presses (scoliosis)."];

  void NISSIM_MEDICAL_PROFILE; // medical guardrails already shaped the allowed exercises upstream

  return {
    kind: "ready",
    data: {
      recoveryScore: input.recovery.recoveryScore,
      band,
      verdictWord: verdict.word,
      verdictTone: verdict.tone,
      sessionType: input.session.type,
      focus: input.session.focus,
      durationMin: estimateDurationMin(branch),
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
    },
  };
}
