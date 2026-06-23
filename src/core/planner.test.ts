import { describe, it, expect } from "vitest";
import { buildDaySession, buildGymExercises, buildSwimExercises, estimateSessionMin } from "./planner";
import { EXERCISE_BY_ID } from "./exercises";

describe("day-of gym session", () => {
  const ex = buildGymExercises("green");
  it("has ~5 exercises across multiple categories", () => {
    expect(ex.length).toBeGreaterThanOrEqual(4);
    const cats = new Set(ex.map((e) => e.category));
    expect(cats.size).toBeGreaterThanOrEqual(3);
  });
  it("only uses approved, non-swim exercises", () => {
    for (const e of ex) {
      expect(EXERCISE_BY_ID[e.exerciseId], e.exerciseId).toBeDefined();
      expect(e.exerciseId).not.toBe("swimming");
      expect(e.exerciseId).not.toBe("city_walk");
    }
  });
});

describe("day-of swim session", () => {
  const ex = buildSwimExercises("green");
  it("ends with the swim, companions first", () => {
    expect(ex[ex.length - 1]!.exerciseId).toBe("swimming");
    const companionsBefore = ex.slice(0, -1).map((e) => e.exerciseId);
    for (const id of companionsBefore) {
      expect(["push_ups", "pull_ups", "exercise_bike", "treadmill_walk"]).toContain(id);
    }
    expect(companionsBefore.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildDaySession", () => {
  it("gym session includes warm-up + cool-down + exercises", () => {
    const s = buildDaySession("gym", "amber", "2026-06-23", { recoveryScore: 55 });
    expect(s.warmup.length).toBeGreaterThan(0);
    expect(s.cooldown.length).toBeGreaterThan(0);
    expect(s.exercises.length).toBeGreaterThanOrEqual(4);
    expect(estimateSessionMin(s)).toBeGreaterThanOrEqual(20);
  });
  it("fallback walk is a single city walk", () => {
    const s = buildDaySession("gym", "amber", "2026-06-23", { fallbackWalk: true });
    expect(s.isFallbackWalk).toBe(true);
    expect(s.exercises.map((e) => e.exerciseId)).toEqual(["city_walk"]);
  });
});
