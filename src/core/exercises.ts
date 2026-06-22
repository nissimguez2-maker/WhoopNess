import type { Exercise, MedicalProfile } from "./types";

/**
 * Seed exercise library with guardrail tags.
 *
 * ⚠️ SAFETY-CRITICAL CONFIG. The tags below are what the guardrail engine uses to
 * keep contraindicated movements away from a post-MPFL knee with a patellofemoral
 * cartilage defect and a mild thoracic scoliosis. Treat changes like medical config:
 * version, test, and have the user (ideally a physio) approve.
 *
 * The library intentionally INCLUDES contraindicated movements (e.g. back squat,
 * loaded leg extension, box jumps). They must never reach the user — they exist so
 * the L1 filter has something to strip and the L3 validator has something to catch.
 */
export const EXERCISES: Exercise[] = [
  // ── Knee-safe lower body (fallback template core) ──
  {
    id: "leg_press_partial",
    name: "Leg press (partial ROM)",
    primaryMuscle: "quads",
    secondaryMuscles: ["hamstrings_glutes"],
    tags: ["machine_supported", "low_impact", "knee_safe"],
    equipment: "machine",
    fallbackSafe: true,
  },
  {
    id: "hip_thrust",
    name: "Barbell hip thrust",
    primaryMuscle: "hamstrings_glutes",
    tags: ["posterior_chain", "knee_safe", "low_impact"],
    equipment: "barbell",
    fallbackSafe: true,
  },
  {
    id: "seated_leg_curl",
    name: "Seated leg curl",
    primaryMuscle: "hamstrings_glutes",
    tags: ["machine_supported", "knee_safe", "low_impact"],
    equipment: "machine",
    fallbackSafe: true,
  },
  {
    id: "romanian_deadlift",
    name: "Romanian deadlift (hip hinge)",
    primaryMuscle: "hamstrings_glutes",
    secondaryMuscles: ["back"],
    tags: ["posterior_chain", "knee_safe", "low_impact"],
    equipment: "barbell",
    fallbackSafe: true,
  },
  {
    id: "standing_calf_raise",
    name: "Standing calf raise",
    primaryMuscle: "calves",
    tags: ["machine_supported", "knee_safe", "low_impact"],
    equipment: "machine",
    fallbackSafe: true,
  },
  // ── Upper body (knee-irrelevant, back-aware) ──
  {
    id: "chest_press_machine",
    name: "Chest press machine",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    tags: ["machine_supported", "low_impact"],
    equipment: "machine",
    fallbackSafe: true,
  },
  {
    id: "incline_db_press",
    name: "Incline dumbbell press",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders", "triceps"],
    tags: ["low_impact"],
    equipment: "dumbbell",
    fallbackSafe: true,
  },
  {
    id: "chest_supported_row",
    name: "Chest-supported row",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
    tags: ["machine_supported", "low_impact", "posterior_chain"],
    equipment: "machine",
    fallbackSafe: true,
  },
  {
    id: "lat_pulldown",
    name: "Lat pulldown",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
    tags: ["machine_supported", "low_impact"],
    equipment: "cable",
    fallbackSafe: true,
  },
  {
    id: "seated_shoulder_press",
    name: "Seated shoulder press (supported)",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps"],
    tags: ["machine_supported", "low_impact"],
    equipment: "machine",
    fallbackSafe: true,
  },
  {
    id: "cable_lateral_raise",
    name: "Cable lateral raise",
    primaryMuscle: "shoulders",
    tags: ["low_impact"],
    equipment: "cable",
    fallbackSafe: true,
  },
  {
    id: "cable_triceps_pushdown",
    name: "Cable triceps pushdown",
    primaryMuscle: "triceps",
    tags: ["low_impact"],
    equipment: "cable",
    fallbackSafe: true,
  },
  {
    id: "incline_db_curl",
    name: "Incline dumbbell curl",
    primaryMuscle: "biceps",
    tags: ["low_impact"],
    equipment: "dumbbell",
    fallbackSafe: true,
  },
  {
    id: "face_pull",
    name: "Cable face pull",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["back"],
    tags: ["low_impact", "posterior_chain", "core_stability"],
    equipment: "cable",
    fallbackSafe: true,
  },
  {
    id: "pallof_press",
    name: "Pallof press (anti-rotation)",
    primaryMuscle: "core",
    tags: ["core_stability", "low_impact", "knee_safe"],
    equipment: "cable",
    fallbackSafe: true,
  },
  {
    id: "dead_bug",
    name: "Dead bug",
    primaryMuscle: "core",
    tags: ["core_stability", "low_impact", "knee_safe"],
    equipment: "bodyweight",
    fallbackSafe: true,
  },
  // ── Knee-safe conditioning ──
  {
    id: "stationary_bike",
    name: "Stationary bike (Z2)",
    primaryMuscle: "quads",
    tags: ["low_impact", "knee_safe"],
    equipment: "cardio",
    fallbackSafe: true,
  },
  {
    id: "swim_easy",
    name: "Easy swim",
    primaryMuscle: "back",
    tags: ["low_impact", "knee_safe"],
    equipment: "cardio",
    fallbackSafe: true,
  },
  // ── CONTRAINDICATED — present only so the engine can strip/catch them ──
  {
    id: "barbell_back_squat",
    name: "Barbell back squat",
    primaryMuscle: "quads",
    tags: ["deep_knee_flexion", "heavy_axial_load"],
    equipment: "barbell",
  },
  {
    id: "loaded_leg_extension",
    name: "Loaded leg extension (full ROM)",
    primaryMuscle: "quads",
    tags: ["loaded_full_rom_knee_extension"],
    equipment: "machine",
  },
  {
    id: "walking_lunge",
    name: "Walking lunge",
    primaryMuscle: "quads",
    tags: ["deep_lunge", "deep_knee_flexion"],
    equipment: "dumbbell",
  },
  {
    id: "box_jump",
    name: "Box jump",
    primaryMuscle: "quads",
    tags: ["jumping_plyometric", "high_impact"],
    equipment: "bodyweight",
  },
  {
    id: "treadmill_run",
    name: "Treadmill run",
    primaryMuscle: "quads",
    tags: ["running", "high_impact"],
    equipment: "cardio",
  },
  {
    id: "conventional_deadlift",
    name: "Conventional deadlift (heavy)",
    primaryMuscle: "hamstrings_glutes",
    secondaryMuscles: ["back"],
    tags: ["heavy_axial_load", "posterior_chain"],
    equipment: "barbell",
  },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

/**
 * Nissim's medical profile → hard constraints + advisories.
 * Left knee: post-MPFL + patellofemoral cartilage defect + instability.
 * Right knee: minor. Back: 8° thoracic scoliosis + back pain.
 */
export const NISSIM_MEDICAL_PROFILE: MedicalProfile = {
  hard: [
    {
      id: "knee_patellofemoral",
      label: "Left knee: post-MPFL surgery + patellofemoral cartilage defect + instability",
      blockedTags: [
        "deep_knee_flexion",
        "loaded_full_rom_knee_extension",
        "deep_lunge",
        "jumping_plyometric",
        "high_impact",
        "running",
      ],
    },
    {
      id: "spine_scoliosis",
      label: "Mild thoracic scoliosis (8°) + back pain",
      blockedTags: ["heavy_axial_load", "ballistic_spinal"],
    },
  ],
  advisories: [
    "Wear knee braces (both knees) for all training except swimming.",
    "Favor symmetric / machine-supported loading; build heavy axial load gradually.",
    "Hydrate well (uric-acid history); favor lipid-friendly kosher choices.",
    "Stop and reassess on any knee pain, swelling, or instability.",
  ],
  maxWeeklyLoadProgression: 0.1,
};
