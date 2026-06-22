import type {
  Exercise,
  MedicalProfile,
  RecoveryReading,
  RedFlagResult,
  ValidationResult,
  WeeklyPlan,
} from "./types";
import { EXERCISE_BY_ID } from "./exercises";

/**
 * The guardrail engine — the "rules dispose" core.
 *
 * Three independent layers protect the user (defense in depth):
 *   L1  filterAllowedExercises  — the LLM is only ever handed safe exercises.
 *   L2  (schema/enum, enforced at the LLM tool boundary, not here)
 *   L3  validatePlan            — re-checks the emitted plan; final gate before display.
 *
 * Safety is code. The LLM proposes; these functions dispose.
 */

/** L1: return only exercises that clear every active hard constraint. */
export function filterAllowedExercises(
  exercises: Exercise[],
  medical: MedicalProfile,
): Exercise[] {
  const blocked = blockedTagSet(medical);
  return exercises.filter((ex) => !ex.tags.some((t) => blocked.has(t)));
}

/** Is a single exercise allowed under the medical profile? */
export function isExerciseAllowed(exercise: Exercise, medical: MedicalProfile): boolean {
  const blocked = blockedTagSet(medical);
  return !exercise.tags.some((t) => blocked.has(t));
}

/**
 * L3: validate a generated weekly plan against the hard guardrails.
 * Catches hallucinated/unknown exercise ids and any contraindicated movement that
 * slipped past L1/L2. Returns every violation found (never throws).
 */
export function validatePlan(plan: WeeklyPlan, medical: MedicalProfile): ValidationResult {
  const blocked = blockedTagSet(medical);
  const constraintForTag = new Map<string, { id: string; label: string }>();
  for (const c of medical.hard) {
    for (const tag of c.blockedTags) constraintForTag.set(tag, { id: c.id, label: c.label });
  }

  const violations: ValidationResult["violations"] = [];

  for (const session of plan.sessions) {
    for (const branch of session.branches) {
      for (const pe of branch.exercises) {
        const ex = EXERCISE_BY_ID[pe.exerciseId];
        if (!ex) {
          violations.push({
            sessionDay: session.day,
            band: branch.band,
            exerciseId: pe.exerciseId,
            constraintId: "unknown_exercise",
            reason: `Unknown exercise id "${pe.exerciseId}" — not in the approved library.`,
          });
          continue;
        }
        const badTag = ex.tags.find((t) => blocked.has(t));
        if (badTag) {
          const c = constraintForTag.get(badTag);
          violations.push({
            sessionDay: session.day,
            band: branch.band,
            exerciseId: pe.exerciseId,
            constraintId: c?.id ?? "unknown_constraint",
            reason: `"${ex.name}" is contraindicated (${badTag}) by: ${c?.label ?? "medical guardrail"}.`,
          });
        }
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

/** Cap a proposed load against the previous load using the profile's max weekly progression. */
export function capProgression(
  previousLoadKg: number,
  proposedLoadKg: number,
  medical: MedicalProfile,
): number {
  const max = previousLoadKg * (1 + medical.maxWeeklyLoadProgression);
  // Round to 1 decimal to avoid float noise and keep loads gym-realistic.
  return Math.round(Math.min(proposedLoadKg, max) * 10) / 10;
}

// ── Red-flag escalation (deterministic, never delegated to the LLM) ──────────

const SYMPTOM_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /chest (pain|pressure|tight)/i, reason: "Reported chest pain/pressure." },
  { re: /(knee).*(giv\w*|lock\w*|buckl\w*|pop\w*)|knee gave way/i, reason: "Knee giving way / locking." },
  { re: /(sharp|radiat\w*|shooting).*(back|spine)|back.*(sharp|radiat\w*|shooting)/i, reason: "Sharp/radiating back pain." },
  { re: /numb\w*|tingl\w*|pins and needles/i, reason: "Numbness / tingling." },
  { re: /(swell\w*|swollen).*(knee|joint)|knee.*(swell\w*|swollen)/i, reason: "New joint swelling." },
  { re: /dizz\w*|faint\w*|passed out|syncope|black\w* out/i, reason: "Dizziness / fainting." },
];

/**
 * Detect red-flag conditions from a free-text message and/or WHOOP vitals.
 * If escalate=true, the app returns a fixed "pause & see a clinician" response and
 * suppresses any "push harder" coaching — this is wired in code, never trusted to the model.
 */
export function detectRedFlags(input: {
  message?: string;
  recovery?: RecoveryReading;
  /** Rolling baselines for the user, used to detect anomalies. */
  baseline?: { restingHr?: number; hrvMs?: number };
}): RedFlagResult {
  const reasons: string[] = [];

  if (input.message) {
    for (const p of SYMPTOM_PATTERNS) {
      if (p.re.test(input.message)) reasons.push(p.reason);
    }
  }

  const r = input.recovery;
  const b = input.baseline;
  if (r && b) {
    // Two-signal confirmation for an illness/overreach cluster.
    const rhrSpike = b.restingHr != null && r.restingHr != null && r.restingHr >= b.restingHr + 7;
    const hrvDrop = b.hrvMs != null && r.hrvMs != null && r.hrvMs <= b.hrvMs * 0.7;
    if (rhrSpike && hrvDrop) {
      reasons.push("Resting HR elevated and HRV well below baseline — possible illness/overreach.");
    }
  }
  if (r?.spo2 != null && r.spo2 < 90) {
    reasons.push(`Low SpO2 (${r.spo2}%).`);
  }

  return { escalate: reasons.length > 0, reasons };
}

// ── internals ────────────────────────────────────────────────────────────────
function blockedTagSet(medical: MedicalProfile): Set<string> {
  const s = new Set<string>();
  for (const c of medical.hard) for (const t of c.blockedTags) s.add(t);
  return s;
}
