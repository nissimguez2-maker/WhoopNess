import { describe, it, expect } from "vitest";
import { computeWhoopFeatures } from "../lib/whoop/features";
import { gymSwimMix, volumeBiasFor } from "./evidence";
import { generateWeeklyPlan, buildSessionBranches, defaultMix, type Slot } from "./planner";
import { validatePlan } from "./guardrails";
import { NISSIM_MEDICAL_PROFILE } from "./exercises";
import type { WeeklyPlan } from "./types";

const M = NISSIM_MEDICAL_PROFILE;
const SLOTS: Slot[] = [
  { day: "Sun", minutes: 60, time: "21:00" },
  { day: "Tue", minutes: 60, time: "07:00" },
  { day: "Thu", minutes: 60, time: "21:00" },
];

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

describe("autoregulation mix + bias", () => {
  it("strained weeks get more swim, fresh weeks favor gym", () => {
    expect(gymSwimMix({ fatigueState: "strained" })).toEqual({ gym: 1, swim: 2 });
    expect(gymSwimMix({ fatigueState: "fresh" })).toEqual({ gym: 2, swim: 1 });
  });
  it("volume bias drops when strained, rises when fresh", () => {
    expect(volumeBiasFor({ fatigueState: "strained" })).toBeLessThan(1);
    expect(volumeBiasFor({ fatigueState: "fresh" })).toBeGreaterThan(1);
  });
});

describe("typed weekly plan (gym | swim)", () => {
  const plan = generateWeeklyPlan(SLOTS, M, "2026-06-27", { mix: ["gym", "swim", "gym"] });

  it("assigns the requested types", () => {
    expect(plan.sessions.map((s) => s.type)).toEqual(["gym", "swim", "gym"]);
  });
  it("passes the guardrail validator incl. the swim/gym invariant", () => {
    const res = validatePlan(plan, M);
    expect(res.ok, JSON.stringify(res.violations)).toBe(true);
  });
  it("default mix puts a swim between gym days", () => {
    expect(defaultMix(3)).toEqual(["gym", "swim", "gym"]);
  });
});

describe("swim/gym invariant in validatePlan", () => {
  it("rejects a gym machine inside a swim session", () => {
    const bad: WeeklyPlan = {
      weekStart: "2026-06-27",
      sessions: [
        {
          day: "Tue",
          type: "swim",
          focus: "Swim",
          branches: [{ band: "green", exercises: [{ exerciseId: "leg_press_partial", sets: 3, reps: "8-10" }] }],
        },
      ],
    };
    const res = validatePlan(bad, M);
    expect(res.ok).toBe(false);
    expect(res.violations.some((v) => v.constraintId === "swim_invariant")).toBe(true);
  });

  it("rejects a swim inside a gym session", () => {
    const bad: WeeklyPlan = {
      weekStart: "2026-06-27",
      sessions: [
        {
          day: "Sun",
          type: "gym",
          focus: "Gym",
          branches: [{ band: "green", exercises: [{ exerciseId: "swim_easy", sets: 1, reps: "—", durationMin: 20 }] }],
        },
      ],
    };
    const res = validatePlan(bad, M);
    expect(res.ok).toBe(false);
    expect(res.violations.some((v) => v.constraintId === "gym_invariant")).toBe(true);
  });

  it("buildSessionBranches('swim') yields a valid swim session", () => {
    const branches = buildSessionBranches("swim", [], M);
    const plan: WeeklyPlan = { weekStart: "2026-06-27", sessions: [{ day: "Tue", type: "swim", focus: "Swim", branches }] };
    expect(validatePlan(plan, M).ok).toBe(true);
  });
});
