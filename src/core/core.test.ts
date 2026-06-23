import { describe, it, expect } from "vitest";
import { EXERCISES, NISSIM_MEDICAL_PROFILE } from "./exercises";
import {
  filterAllowedExercises,
  isExerciseAllowed,
  validatePlan,
  capProgression,
  detectRedFlags,
} from "./guardrails";
import { selectBand, selectBranch } from "./recovery";
import {
  epley1RM,
  weeklySetsByMuscle,
  harmonyScore,
  DEFAULT_TARGET_SHARES,
  type LoggedSet,
} from "./metrics";
import { fuelingTargets, proteinTargetG } from "./fueling";
import { EXERCISE_BY_ID } from "./exercises";
import type { WeeklyPlan } from "./types";

const M = NISSIM_MEDICAL_PROFILE;

describe("guardrails — L1 filter", () => {
  it("strips every contraindicated movement from the allowed set", () => {
    const allowed = filterAllowedExercises(EXERCISES, M);
    const ids = new Set(allowed.map((e) => e.id));
    // Contraindicated movements must NOT survive the filter.
    for (const bad of [
      "barbell_back_squat",
      "loaded_leg_extension",
      "walking_lunge",
      "box_jump",
      "treadmill_run",
      "conventional_deadlift",
    ]) {
      expect(ids.has(bad), `${bad} should be filtered out`).toBe(false);
    }
  });

  it("keeps knee/back-safe staples", () => {
    const allowed = filterAllowedExercises(EXERCISES, M);
    const ids = new Set(allowed.map((e) => e.id));
    for (const good of ["leg_press_partial", "hip_thrust", "romanian_deadlift", "lat_pulldown", "stationary_bike"]) {
      expect(ids.has(good), `${good} should be allowed`).toBe(true);
    }
  });

  it("every allowed exercise individually passes isExerciseAllowed", () => {
    for (const ex of filterAllowedExercises(EXERCISES, M)) {
      expect(isExerciseAllowed(ex, M)).toBe(true);
    }
  });
});

describe("guardrails — L3 validator", () => {
  it("passes a clean knee-safe plan", () => {
    const plan: WeeklyPlan = {
      weekStart: "2026-06-27",
      sessions: [
        {
          day: "Sun",
          type: "gym",
          focus: "Full body A",
          branches: [
            { band: "green", exercises: [{ exerciseId: "leg_press_partial", sets: 3, reps: "8-10" }, { exerciseId: "chest_press_machine", sets: 3, reps: "8-10" }] },
            { band: "amber", exercises: [{ exerciseId: "leg_press_partial", sets: 2, reps: "10-12" }] },
            { band: "red", exercises: [{ exerciseId: "stationary_bike", sets: 1, reps: "20min" }] },
          ],
        },
      ],
    };
    expect(validatePlan(plan, M).ok).toBe(true);
  });

  it("catches a contraindicated movement that slipped into a branch", () => {
    const plan: WeeklyPlan = {
      weekStart: "2026-06-27",
      sessions: [
        {
          day: "Sun",
          type: "gym",
          focus: "Legs",
          branches: [
            { band: "green", exercises: [{ exerciseId: "barbell_back_squat", sets: 5, reps: "5" }] },
          ],
        },
      ],
    };
    const res = validatePlan(plan, M);
    expect(res.ok).toBe(false);
    expect(res.violations[0]?.constraintId).toBe("knee_patellofemoral");
  });

  it("flags unknown / hallucinated exercise ids", () => {
    const plan: WeeklyPlan = {
      weekStart: "2026-06-27",
      sessions: [{ day: "Mon", type: "gym", focus: "x", branches: [{ band: "green", exercises: [{ exerciseId: "imaginary_lift", sets: 3, reps: "8" }] }] }],
    };
    const res = validatePlan(plan, M);
    expect(res.ok).toBe(false);
    expect(res.violations[0]?.constraintId).toBe("unknown_exercise");
  });

  it("catches heavy axial load (back guardrail)", () => {
    const plan: WeeklyPlan = {
      weekStart: "2026-06-27",
      sessions: [{ day: "Tue", type: "gym", focus: "Pull", branches: [{ band: "green", exercises: [{ exerciseId: "conventional_deadlift", sets: 3, reps: "5" }] }] }],
    };
    const res = validatePlan(plan, M);
    expect(res.ok).toBe(false);
    expect(res.violations.some((v) => v.constraintId === "spine_scoliosis")).toBe(true);
  });
});

describe("guardrails — progression cap", () => {
  it("caps load increase at the profile max (10%)", () => {
    expect(capProgression(100, 130, M)).toBe(110);
    expect(capProgression(100, 105, M)).toBe(105); // under the cap → unchanged
  });
});

describe("guardrails — red-flag escalation", () => {
  it("escalates on chest pain", () => {
    expect(detectRedFlags({ message: "I have chest pain when I walk" }).escalate).toBe(true);
  });
  it("escalates on knee giving way / locking", () => {
    expect(detectRedFlags({ message: "my knee gave way and locked up" }).escalate).toBe(true);
  });
  it("escalates on the two-signal illness cluster", () => {
    const res = detectRedFlags({
      recovery: { recoveryScore: 25, restingHr: 70, hrvMs: 30 },
      baseline: { restingHr: 60, hrvMs: 50 },
    });
    expect(res.escalate).toBe(true);
  });
  it("does NOT escalate on a normal message", () => {
    expect(detectRedFlags({ message: "felt good today, slight DOMS in chest" }).escalate).toBe(false);
  });
  it("escalates on low SpO2", () => {
    expect(detectRedFlags({ recovery: { recoveryScore: 50, spo2: 88 } }).escalate).toBe(true);
  });
});

describe("recovery — band & branch selection", () => {
  it("maps scores to bands on standard thresholds", () => {
    expect(selectBand({ recoveryScore: 80 })).toBe("green");
    expect(selectBand({ recoveryScore: 50 })).toBe("amber");
    expect(selectBand({ recoveryScore: 20 })).toBe("red");
  });
  it("conservative bias backs off sooner", () => {
    expect(selectBand({ recoveryScore: 70 }, "conservative")).toBe("amber");
    expect(selectBand({ recoveryScore: 70 }, "standard")).toBe("green");
  });
  it("selects the matching branch, falling back to a safer one", () => {
    const branches = [
      { band: "green" as const, exercises: [] },
      { band: "red" as const, exercises: [] },
    ];
    expect(selectBranch(branches, "green")?.band).toBe("green");
    // amber missing → prefer the safer (red) over the harder (green)
    expect(selectBranch(branches, "amber")?.band).toBe("red");
  });
});

describe("metrics — strength, volume, harmony", () => {
  it("computes Epley e1RM", () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 5)).toBeCloseTo(116.7, 1);
  });

  it("attributes weekly sets to primary (1.0) and secondary (0.5) muscles", () => {
    const sets: LoggedSet[] = [
      { exerciseId: "chest_press_machine", done: true }, // chest 1, triceps .5, shoulders .5
      { exerciseId: "lat_pulldown", done: true }, // back 1, biceps .5
      { exerciseId: "lat_pulldown", done: false }, // skipped → ignored
    ];
    const byMuscle = weeklySetsByMuscle(sets);
    expect(byMuscle.chest).toBe(1);
    expect(byMuscle.triceps).toBe(0.5);
    expect(byMuscle.back).toBe(1);
    expect(byMuscle.biceps).toBe(0.5);
  });

  it("harmony score is 100 when the distribution matches targets exactly", () => {
    // Build a distribution proportional to DEFAULT_TARGET_SHARES.
    const setsByMuscle = { ...DEFAULT_TARGET_SHARES } as Record<string, number>;
    const res = harmonyScore(setsByMuscle as never);
    expect(res.score).toBe(100);
  });

  it("harmony flags the lagging muscle group", () => {
    const res = harmonyScore({
      chest: 10, back: 0, shoulders: 2, biceps: 2, triceps: 2, quads: 2, hamstrings_glutes: 2, calves: 1, core: 1,
    });
    expect(res.score).toBeLessThan(100);
    expect(res.lagging).toBe("back"); // most under-represented vs its 18% target
  });

  it("harmony score is 0 with no training logged", () => {
    expect(harmonyScore(weeklySetsByMuscle([])).score).toBe(0);
  });
});

describe("fueling — recomposition + GLP-1 taper", () => {
  it("targets ~2 g/kg protein", () => {
    expect(proteinTargetG(78)).toBe(156);
  });
  it("emphasizes the protein floor during the taper", () => {
    const t = fuelingTargets({ bodyweightKg: 78, band: "green", taper: "tapering", isTrainingDay: true });
    expect(t.proteinG).toBe(156);
    expect(t.preCarbG).toBe(40);
    expect(t.proteinFloorNote).toMatch(/appetite returns/i);
  });
  it("no pre-session carbs on a rest day", () => {
    const t = fuelingTargets({ bodyweightKg: 78, band: "red", taper: "tapering", isTrainingDay: false });
    expect(t.preCarbG).toBe(0);
  });
});

describe("library integrity", () => {
  it("every exercise id is unique and resolvable", () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(EXERCISE_BY_ID[id]).toBeDefined();
  });
});
