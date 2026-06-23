import type { Exercise, MedicalProfile } from "./types";

/**
 * Exercise library — the EXACT set Nissim approved. The planner may propose nothing
 * outside this list. Each carries 2–3 plain bullets on safe execution (knee/back-aware:
 * post-MPFL left knee + patellofemoral cartilage defect, mild thoracic scoliosis).
 *
 * Categories drive even weekly distribution. `swimEligible` items may appear in a swim
 * session — and only BEFORE the swim (you're wet after).
 */
export const EXERCISES: Exercise[] = [
  // ── PUSH ──────────────────────────────────────────────────────────────────
  {
    id: "machine_chest_press",
    name: "Machine Chest Press",
    category: "push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    tags: ["machine_supported", "low_impact"],
    equipment: "machine",
    defaultRestSec: 90,
    cues: [
      "Set the seat so the handles sit at mid-chest; shoulder blades pulled back and down.",
      "Press smoothly, stop just short of locking the elbows — don't let them flare past your wrists.",
      "Keep your lower back lightly against the pad (no big arch).",
    ],
  },
  {
    id: "flat_db_bench_press",
    name: "Face-Up (Flat Bench) Dumbbell Press",
    category: "push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    tags: ["low_impact"],
    equipment: "dumbbell",
    defaultRestSec: 90,
    cues: [
      "Lie face-up, feet flat; press the dumbbells up and slightly together.",
      "Lower with elbows at ~45° to your body until they're level with the bench — no deeper.",
      "Ribs down, no big back arch; control the weight, don't bounce.",
    ],
  },
  {
    id: "standing_cable_chest_press",
    name: "Standing Cable Chest Press",
    category: "push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "core"],
    tags: ["low_impact", "core_stability"],
    equipment: "cable",
    defaultRestSec: 75,
    cues: [
      "Split stance, brace your core so your back stays neutral (no leaning back).",
      "Press the handles forward and together; return under control.",
      "Keep ribs down — the work is in the chest, not the lower back.",
    ],
  },
  {
    id: "seated_shoulder_press",
    name: "Seated Shoulder Press",
    category: "push",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps"],
    tags: ["machine_supported", "low_impact"],
    equipment: "machine",
    defaultRestSec: 90,
    cues: [
      "Back supported against the pad; press just short of locking out.",
      "Lower to about ear height — no need to go lower.",
      "Keep ribs down and core gently braced to protect the lower back.",
    ],
  },
  {
    id: "push_ups",
    name: "Push-ups",
    category: "push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders", "core"],
    tags: ["low_impact", "swim_eligible"],
    equipment: "bodyweight",
    defaultRestSec: 75,
    cues: [
      "Hands under shoulders, body in one straight line — squeeze glutes and brace your core.",
      "Lower with elbows ~45°; drop to your knees if your form or back starts to sag.",
      "Don't let your hips pike up or your lower back dip.",
    ],
  },
  // ── PULL ──────────────────────────────────────────────────────────────────
  {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    category: "pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
    tags: ["machine_supported", "low_impact"],
    equipment: "cable",
    defaultRestSec: 90,
    cues: [
      "Sit tall, thighs under the pad; pull the bar to your upper chest leading with the elbows.",
      "Control the bar back up to a full stretch — no big lean-back or yanking.",
      "Keep your chest up and avoid shrugging your shoulders to your ears.",
    ],
  },
  {
    id: "pull_ups",
    name: "Pull-ups (assisted as needed)",
    category: "pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
    tags: ["low_impact", "swim_eligible"],
    equipment: "bodyweight",
    defaultRestSec: 90,
    cues: [
      "Use a band or the assisted machine so you can control every rep.",
      "Pull your chest toward the bar by driving elbows down; lower slowly to a full hang.",
      "No kipping or jerking — smooth and controlled to protect shoulders and back.",
    ],
  },
  {
    id: "prone_db_row",
    name: "Face-Down (Flat Bench) Dumbbell Press",
    category: "pull",
    primaryMuscle: "back",
    secondaryMuscles: ["shoulders", "biceps"],
    tags: ["machine_supported", "low_impact", "posterior_chain"],
    equipment: "dumbbell",
    defaultRestSec: 90,
    cues: [
      "Lie face-down on a flat bench (chest supported) — this protects your lower back completely.",
      "Row/press the dumbbells up by squeezing your shoulder blades together; lower slowly.",
      "Keep your neck long and relaxed; let the bench take your bodyweight.",
    ],
  },
  {
    id: "cable_face_pull",
    name: "Cable Face Pull",
    category: "pull",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["back"],
    tags: ["low_impact", "posterior_chain", "core_stability"],
    equipment: "cable",
    defaultRestSec: 60,
    cues: [
      "Rope at face height; pull toward your forehead, splitting the rope and rotating shoulders back.",
      "Stand tall and braced — don't lean back or arch.",
      "Light weight, smooth tempo — this is for posture and shoulder health.",
    ],
  },
  // ── LEGS (knee-safe) ────────────────────────────────────────────────────────
  {
    id: "seated_leg_press",
    name: "Seated Leg Press",
    category: "legs",
    primaryMuscle: "quads",
    secondaryMuscles: ["hamstrings_glutes"],
    tags: ["machine_supported", "low_impact", "knee_safe"],
    equipment: "machine",
    defaultRestSec: 120,
    cues: [
      "Set the range so your knees never bend past ~90° — protect the kneecap, no deep bend.",
      "Push through your mid-foot/heel; stop just short of locking the knees.",
      "Move slowly and stop immediately if you feel anything sharp behind the kneecap.",
    ],
  },
  {
    id: "supported_step_ups",
    name: "Supported Step-ups",
    category: "legs",
    primaryMuscle: "quads",
    secondaryMuscles: ["hamstrings_glutes"],
    tags: ["low_impact", "knee_safe"],
    equipment: "bodyweight",
    defaultRestSec: 90,
    cues: [
      "Use a LOW step and hold a rail/support — keep the front knee tracking over the toes.",
      "Drive up through the heel of the standing leg; step down softly and controlled.",
      "Keep the step low enough that the knee never passes ~90° — no deep or fast steps.",
    ],
  },
  {
    id: "seated_leg_extension",
    name: "Seated Leg Extension",
    category: "legs",
    primaryMuscle: "quads",
    tags: ["machine_supported", "knee_safe"],
    equipment: "machine",
    defaultRestSec: 75,
    cues: [
      "Go LIGHT and use only a pain-free partial range (often the top half) — protects the cartilage.",
      "Squeeze at the top, lower slowly; never force a deep bend or push through pain.",
      "Stop at once if you feel grinding or sharpness behind the kneecap.",
    ],
  },
  {
    id: "seated_leg_curl",
    name: "Seated Leg Curl",
    category: "legs",
    primaryMuscle: "hamstrings_glutes",
    tags: ["machine_supported", "low_impact", "knee_safe"],
    equipment: "machine",
    defaultRestSec: 75,
    cues: [
      "Pad just above the heels; curl down by bending the knees, pause briefly.",
      "Return slowly under control — don't let the stack slam.",
      "Keep hips down on the seat; smooth tempo, no jerking.",
    ],
  },
  // ── CORE ──────────────────────────────────────────────────────────────────
  {
    id: "pallof_press",
    name: "The Pallof Press",
    category: "core",
    primaryMuscle: "core",
    tags: ["core_stability", "low_impact", "knee_safe"],
    equipment: "cable",
    defaultRestSec: 45,
    cues: [
      "Stand side-on to the cable, feet hip-width, core braced.",
      "Press the handle straight out and RESIST the twist — hold, then bring it back in.",
      "Keep hips and shoulders square; breathe steadily, don't hold your breath.",
    ],
  },
  {
    id: "cable_woodchop",
    name: "Perpendicular Cable Woodchop (low to high)",
    category: "core",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders"],
    tags: ["core_stability", "low_impact"],
    equipment: "cable",
    defaultRestSec: 45,
    cues: [
      "Rotate from your ribcage and hips together — not by twisting your lower back.",
      "Smooth, controlled arc from low to high; pivot the back foot to let the hips turn.",
      "Moderate weight — control beats heavy here; keep it pain-free for the back.",
    ],
  },
  // ── CARDIO / CONDITIONING ───────────────────────────────────────────────────
  {
    id: "exercise_bike",
    name: "Exercise Bike",
    category: "cardio",
    primaryMuscle: "quads",
    tags: ["low_impact", "knee_safe", "swim_eligible"],
    equipment: "cardio",
    isDuration: true,
    cues: [
      "Set the seat high enough that your knee stays slightly bent at the bottom of the pedal.",
      "Steady, easy-to-moderate effort you can hold a conversation through.",
      "No heavy grinding resistance — keep the knees happy.",
    ],
  },
  {
    id: "treadmill_walk",
    name: "Treadmill — Fast Walk (no running)",
    category: "cardio",
    primaryMuscle: "quads",
    tags: ["low_impact", "knee_safe", "swim_eligible"],
    equipment: "cardio",
    isDuration: true,
    cues: [
      "Brisk WALK only — never run (running is off-limits for your knee).",
      "Keep it flat or a very slight incline; long, relaxed stride.",
      "Stop if you feel knee pain; walking should be comfortable.",
    ],
  },
  {
    id: "swimming",
    name: "Swimming",
    category: "cardio",
    primaryMuscle: "back",
    secondaryMuscles: ["shoulders", "chest", "core"],
    tags: ["low_impact", "knee_safe"],
    equipment: "cardio",
    isDuration: true,
    cues: [
      "Easy-to-moderate laps — superb low-impact, full-body work with zero joint load.",
      "Mix strokes if comfortable; no brace needed in the water.",
      "Breathe relaxed and steady; stop a few laps short of fully gassed.",
    ],
  },
  {
    id: "city_walk",
    name: "City Walk (≥ 60 min)",
    category: "cardio",
    primaryMuscle: "quads",
    tags: ["low_impact", "knee_safe"],
    equipment: "cardio",
    isDuration: true,
    cues: [
      "When the gym/pool isn't possible: a brisk hour-plus walk around the city.",
      "Comfortable shoes, flat-ish route; keep a steady conversational pace.",
      "Easy on the knee and great for recovery and step count.",
    ],
  },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/** Items allowed in a swim session — done BEFORE the swim (you're wet after). */
export const SWIM_COMPANION_IDS = ["push_ups", "pull_ups", "treadmill_walk", "exercise_bike"];

/** Standard warm-up / cool-down bullets bookending every physical session. */
export const WARMUP = {
  gym: [
    "5 min easy bike or brisk treadmill walk to warm up.",
    "Knee & hip: 8–10 slow sit-to-stands to a high seat (pain-free range) + gentle leg swings.",
    "Shoulders & back: band pull-aparts + 6–8 cat-cow reps for a neutral spine.",
  ],
  swim: [
    "On land first: 3–4 min brisk walk + arm circles and band pull-aparts.",
    "Gentle hip and knee mobility so you enter the water loose.",
    "Ease into the first lap or two before picking up the pace.",
  ],
} as const;

export const COOLDOWN = {
  gym: [
    "3–5 min very easy bike or walk to bring the heart rate down.",
    "Gentle stretch: quads, hamstrings, chest, lats — 20–30s each, no bouncing.",
    "Note how the knees and back feel (use this when you log).",
  ],
  swim: [
    "2–3 very easy laps to flush out, then get out.",
    "Light shoulder and chest stretch on the deck.",
    "Note how the body feels (use this when you log).",
  ],
} as const;

/**
 * Nissim's medical profile. The curated library above is the primary safety boundary;
 * these hard tags still block clearly contraindicated patterns (kept for chat screening).
 * Note: seated leg extension is included per Nissim's explicit request, with light/partial
 * pain-free guidance, so the full-ROM-extension block is intentionally not applied here.
 */
export const NISSIM_MEDICAL_PROFILE: MedicalProfile = {
  hard: [
    {
      id: "knee_patellofemoral",
      label: "Left knee: post-MPFL surgery + patellofemoral cartilage defect + instability",
      blockedTags: ["deep_knee_flexion", "deep_lunge", "jumping_plyometric", "high_impact", "running"],
    },
    {
      id: "spine_scoliosis",
      label: "Mild thoracic scoliosis (8°) + back pain",
      blockedTags: ["heavy_axial_load", "ballistic_spinal"],
    },
  ],
  advisories: [
    "Wear knee braces (both knees) for all training except swimming.",
    "Favor symmetric / supported loading; keep everything pain-free.",
    "Stop and reassess on any knee pain, swelling, or instability.",
  ],
  maxWeeklyLoadProgression: 0.1,
};
