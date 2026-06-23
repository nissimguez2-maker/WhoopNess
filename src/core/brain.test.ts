import { describe, it, expect } from "vitest";
import { computeWhoopFeatures } from "../lib/whoop/features";
import { buildSwimExercises } from "./planner";
import { filterAllowedExercises, screenMessageForBannedExercise } from "./guardrails";
import { EXERCISES, NISSIM_MEDICAL_PROFILE } from "./exercises";

const M = NISSIM_MEDICAL_PROFILE;

describe("WHOOP features", () => {
  it("reads a well-recovered, improving week as 'fresh'", () => {
    const recovery = [80, 78, 76, 74, 72, 70, 68].map((s, i) => ({ date: `d${i}`, recoveryScore: s, hrvMs: 60 - i, restingHr: 50 }));
    const f = computeWhoopFeatures({ recovery, strain: [], sleep: [] });
    expect(f.recovery7dMean).toBe(74);
    expect(f.recoverySlope!).toBeGreaterThan(0);
    expect(f.fatigueState).toBe("fresh");
  });
  it("reads a low, declining week as 'strained'", () => {
    const recovery = [30, 35, 33, 40, 38, 42, 45].map((s, i) => ({ date: `d${i}`, recoveryScore: s, hrvMs: 30, restingHr: 60 }));
    const f = computeWhoopFeatures({ recovery, strain: [], sleep: [] });
    expect(f.fatigueState).toBe("strained");
  });
});

describe("approved library is safe by construction", () => {
  it("nothing in the library is contraindicated", () => {
    const allowed = filterAllowedExercises(EXERCISES, M);
    expect(allowed.length).toBe(EXERCISES.length); // curated list — all pass
  });
  it("every exercise has a category and at least 2 safety cues", () => {
    for (const e of EXERCISES) {
      expect(e.category, e.id).toBeTruthy();
      expect((e.cues ?? []).length, e.id).toBeGreaterThanOrEqual(2);
    }
  });
  it("swim companions are all swim-eligible and exclude the swim itself", () => {
    const swim = buildSwimExercises("amber");
    const companions = swim.slice(0, -1);
    for (const c of companions) expect(["push_ups", "pull_ups", "exercise_bike", "treadmill_walk"]).toContain(c.exerciseId);
  });
});

describe("chat safety screening (new ids)", () => {
  it("flags running → exercise bike", () => {
    const r = screenMessageForBannedExercise("can I go for a run?", M);
    expect(r?.substituteName).toMatch(/bike/i);
  });
  it("flags deep squats → seated leg press", () => {
    const r = screenMessageForBannedExercise("should I do deep squats?", M);
    expect(r?.substituteName).toMatch(/leg press/i);
  });
  it("does not flag approved work", () => {
    expect(screenMessageForBannedExercise("how many lat pulldowns?", M)).toBeNull();
  });
});
