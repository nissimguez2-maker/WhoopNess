import { describe, it, expect } from "vitest";
import { EXERCISES, EXERCISE_BY_ID, NISSIM_MEDICAL_PROFILE } from "./exercises";
import { filterAllowedExercises, isExerciseAllowed, capProgression, detectRedFlags } from "./guardrails";
import { selectBand } from "./recovery";
import { epley1RM, weeklySetsByMuscle, harmonyScore, DEFAULT_TARGET_SHARES, type LoggedSet } from "./metrics";
import { proteinTargetG, proteinOptionsFor, PROTEIN_DOSES } from "./protein";

const M = NISSIM_MEDICAL_PROFILE;

describe("guardrails", () => {
  it("the curated library is all allowed (safe by construction)", () => {
    const allowed = filterAllowedExercises(EXERCISES, M);
    expect(allowed.length).toBe(EXERCISES.length);
    for (const ex of allowed) expect(isExerciseAllowed(ex, M)).toBe(true);
  });
  it("caps load progression at 10%", () => {
    expect(capProgression(100, 130, M)).toBe(110);
    expect(capProgression(100, 105, M)).toBe(105);
  });
  it("escalates on red-flag symptoms", () => {
    expect(detectRedFlags({ message: "sharp radiating back pain" }).escalate).toBe(true);
    expect(detectRedFlags({ message: "felt great, mild DOMS" }).escalate).toBe(false);
  });
});

describe("recovery band", () => {
  it("maps recovery to green/amber/red", () => {
    expect(selectBand({ recoveryScore: 80 })).toBe("green");
    expect(selectBand({ recoveryScore: 50 })).toBe("amber");
    expect(selectBand({ recoveryScore: 20 })).toBe("red");
  });
});

describe("metrics", () => {
  it("Epley e1RM", () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 5)).toBeCloseTo(116.7, 1);
  });
  it("attributes weekly sets to primary (1) + secondary (0.5)", () => {
    const sets: LoggedSet[] = [
      { exerciseId: "machine_chest_press", done: true }, // chest 1, triceps .5, shoulders .5
      { exerciseId: "lat_pulldown", done: true }, // back 1, biceps .5
    ];
    const m = weeklySetsByMuscle(sets);
    expect(m.chest).toBe(1);
    expect(m.back).toBe(1);
    expect(m.biceps).toBe(0.5);
  });
  it("harmony is 100 when distribution matches target", () => {
    expect(harmonyScore({ ...DEFAULT_TARGET_SHARES } as never).score).toBe(100);
  });
});

describe("protein reference", () => {
  it("targets ~2 g/kg", () => {
    expect(proteinTargetG(78)).toBe(156);
  });
  it("picks the closest dose bucket", () => {
    expect(proteinOptionsFor(155).grams).toBe(160);
    expect(proteinOptionsFor(125).grams).toBe(120);
  });
  it("KOSHER: no option mixes meat with dairy", () => {
    const meat = /chicken|beef|turkey/i;
    const dairy = /yogurt|cottage|whey|milk|cheese/i;
    for (const dose of PROTEIN_DOSES) {
      for (const opt of dose.options) {
        expect(meat.test(opt) && dairy.test(opt), `meat+dairy in: ${opt}`).toBe(false);
      }
    }
  });
});

describe("library integrity", () => {
  it("ids are unique and resolvable", () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(EXERCISE_BY_ID[id]).toBeDefined();
  });
});
