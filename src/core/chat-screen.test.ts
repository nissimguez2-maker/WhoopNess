import { describe, it, expect } from "vitest";
import { screenMessageForBannedExercise } from "./guardrails";
import { NISSIM_MEDICAL_PROFILE } from "./exercises";

const M = NISSIM_MEDICAL_PROFILE;

describe("chat safety — contraindicated exercise screening", () => {
  it("flags back squats and suggests leg press", () => {
    const r = screenMessageForBannedExercise("can I do back squats today?", M);
    expect(r).not.toBeNull();
    expect(r!.banned).toMatch(/squat/i);
    expect(r!.substituteName).toMatch(/leg press/i);
  });

  it("flags running and suggests the bike", () => {
    const r = screenMessageForBannedExercise("I feel like going for a run", M);
    expect(r?.substituteName).toMatch(/bike/i);
  });

  it("flags heavy deadlifts (scoliosis/axial load)", () => {
    const r = screenMessageForBannedExercise("should I add deadlifts?", M);
    expect(r).not.toBeNull();
    expect(r!.substituteName).toMatch(/romanian/i);
  });

  it("does NOT flag allowed work", () => {
    expect(screenMessageForBannedExercise("how many sets of lat pulldown?", M)).toBeNull();
    expect(screenMessageForBannedExercise("can I do hip thrusts and curls?", M)).toBeNull();
  });
});
