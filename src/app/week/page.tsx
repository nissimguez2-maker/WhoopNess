import { WeeklyPlanView, type SessionView } from "@/components/WeeklyPlanView";
import { generateWeeklyPlan, estimateDurationMin, type Slot } from "@/core/planner";
import { NISSIM_MEDICAL_PROFILE, EXERCISE_BY_ID } from "@/core/exercises";

const BRANCH_LABEL = { green: "Primary", amber: "Lighter", red: "Recovery" } as const;

// Default slots until the planning ritual + persistence are wired (phase 2).
const DEFAULT_SLOTS: Slot[] = [
  { day: "Sun", minutes: 60, time: "21:00" },
  { day: "Tue", minutes: 60, time: "07:00" },
  { day: "Thu", minutes: 75, time: "21:00" },
];

export default function WeekPage() {
  const plan = generateWeeklyPlan(DEFAULT_SLOTS, NISSIM_MEDICAL_PROFILE, "2026-06-27");

  const sessions: SessionView[] = plan.sessions.map((s, i) => ({
    day: s.day,
    time: DEFAULT_SLOTS[i]?.time,
    focus: s.focus,
    branches: s.branches.map((b) => ({
      band: b.band,
      label: BRANCH_LABEL[b.band],
      durationMin: estimateDurationMin(b),
      exercises: b.exercises.map((pe) => {
        const ex = EXERCISE_BY_ID[pe.exerciseId];
        return { name: ex?.name ?? pe.exerciseId, detail: `${pe.sets} × ${pe.reps}` };
      }),
    })),
  }));

  return <WeeklyPlanView sessions={sessions} weekLabel="Week of 27 Jun" />;
}
