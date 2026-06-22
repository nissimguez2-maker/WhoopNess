import { describe, it, expect } from "vitest";
import { generateWeeklyPlan, estimateDurationMin, type Slot } from "./planner";
import { validatePlan } from "./guardrails";
import { NISSIM_MEDICAL_PROFILE, EXERCISE_BY_ID } from "./exercises";
import type { MuscleGroup } from "./types";

const SLOTS: Slot[] = [
  { day: "Sun", minutes: 60, time: "21:00" },
  { day: "Tue", minutes: 60, time: "07:00" },
  { day: "Thu", minutes: 75, time: "21:00" },
];

describe("weekly planner", () => {
  const plan = generateWeeklyPlan(SLOTS, NISSIM_MEDICAL_PROFILE, "2026-06-27");

  it("creates one session per slot", () => {
    expect(plan.sessions).toHaveLength(3);
    expect(plan.sessions.map((s) => s.day)).toEqual(["Sun", "Tue", "Thu"]);
  });

  it("gives every session green/amber/red branches", () => {
    for (const s of plan.sessions) {
      expect(s.branches.map((b) => b.band)).toEqual(["green", "amber", "red"]);
    }
  });

  it("passes the guardrail validator (safe by construction)", () => {
    const res = validatePlan(plan, NISSIM_MEDICAL_PROFILE);
    expect(res.ok, JSON.stringify(res.violations)).toBe(true);
  });

  it("covers all major muscle groups across the week (balance)", () => {
    const covered = new Set<MuscleGroup>();
    for (const s of plan.sessions) {
      for (const e of s.branches[0]!.exercises) {
        const ex = EXERCISE_BY_ID[e.exerciseId]!;
        covered.add(ex.primaryMuscle);
        (ex.secondaryMuscles ?? []).forEach((m) => covered.add(m));
      }
    }
    for (const m of ["chest", "back", "shoulders", "quads", "hamstrings_glutes", "core"] as MuscleGroup[]) {
      expect(covered.has(m), `missing ${m}`).toBe(true);
    }
  });

  it("amber branch is lighter than green (fewer total sets)", () => {
    for (const s of plan.sessions) {
      const green = s.branches.find((b) => b.band === "green")!;
      const amber = s.branches.find((b) => b.band === "amber")!;
      const gSets = green.exercises.reduce((n, e) => n + e.sets, 0);
      const aSets = amber.exercises.reduce((n, e) => n + e.sets, 0);
      expect(aSets).toBeLessThan(gSets);
    }
  });

  it("estimates a sane duration", () => {
    const green = plan.sessions[0]!.branches[0]!;
    expect(estimateDurationMin(green)).toBeGreaterThanOrEqual(20);
    expect(estimateDurationMin(plan.sessions[0]!.branches[2]!)).toBe(20); // red = recovery
  });
});
