import { weeklySetsByMuscle, harmonyScore, type LoggedSet } from "@/core/metrics";

/**
 * Mock trends data. The harmony view flows through the REAL core (weeklySetsByMuscle +
 * harmonyScore); only the inputs are stubbed. Strength/volume series are mock arrays
 * until live logs exist. Slightly imbalanced (back lagging) so the views are meaningful.
 */

// A representative week of logged sets (quick-log: done flags) — back deliberately light.
const WEEK_SETS: LoggedSet[] = [
  ...rep("chest_press_machine", 3),
  ...rep("incline_db_press", 3),
  ...rep("cable_lateral_raise", 3),
  ...rep("seated_shoulder_press", 3),
  ...rep("cable_triceps_pushdown", 3),
  ...rep("incline_db_curl", 3),
  ...rep("lat_pulldown", 2), // back light
  ...rep("leg_press_partial", 3),
  ...rep("romanian_deadlift", 3),
  ...rep("hip_thrust", 2),
  ...rep("standing_calf_raise", 3),
  ...rep("pallof_press", 2),
  ...rep("dead_bug", 2),
];

function rep(exerciseId: string, n: number): LoggedSet[] {
  return Array.from({ length: n }, () => ({ exerciseId, done: true }));
}

export function getHarmony() {
  const byMuscle = weeklySetsByMuscle(WEEK_SETS);
  const h = harmonyScore(byMuscle);
  return { byMuscle, ...h };
}

// e1RM trend (kg) over 6 weeks — neural gains for a returning lifter.
export const E1RM_SERIES = [
  { week: "W1", chestPress: 55, legPress: 100 },
  { week: "W2", chestPress: 57, legPress: 108 },
  { week: "W3", chestPress: 60, legPress: 115 },
  { week: "W4", chestPress: 61, legPress: 120 },
  { week: "W5", chestPress: 64, legPress: 126 },
  { week: "W6", chestPress: 66, legPress: 132 },
];

// Total weekly hard sets, trending up.
export const VOLUME_SERIES = [
  { week: "W1", sets: 28 },
  { week: "W2", sets: 31 },
  { week: "W3", sets: 33 },
  { week: "W4", sets: 30 },
  { week: "W5", sets: 35 },
  { week: "W6", sets: 38 },
];

// Bodyweight (7-day mean) — flat/slightly down while volume rises = recomposition working.
export const WEIGHT_SERIES = [
  { week: "W1", kg: 78.4, sets: 28 },
  { week: "W2", kg: 78.1, sets: 31 },
  { week: "W3", kg: 78.2, sets: 33 },
  { week: "W4", kg: 77.9, sets: 30 },
  { week: "W5", kg: 77.8, sets: 35 },
  { week: "W6", kg: 77.6, sets: 38 },
];
