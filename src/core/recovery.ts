import type { RecoveryBand, RecoveryReading, SessionBranch } from "./types";

/**
 * Recovery → band selection. Deterministic and transparent: the same recovery
 * always maps to the same band. WHOOP's standard thresholds (green ≥67 / amber
 * 34–66 / red ≤33) to start; personalize to the user's rolling baseline later.
 *
 * `bias` reflects the user's autoregulation preference:
 *   "standard" — WHOOP thresholds as-is (the chosen default).
 *   "conservative" — back off sooner (raise thresholds).
 *   "push" — only back off on clearly bad days (lower thresholds).
 */
export type AutoregBias = "standard" | "conservative" | "push";

const THRESHOLDS: Record<AutoregBias, { green: number; amber: number }> = {
  standard: { green: 67, amber: 34 },
  conservative: { green: 75, amber: 45 },
  push: { green: 60, amber: 25 },
};

export function selectBand(
  recovery: RecoveryReading,
  bias: AutoregBias = "standard",
): RecoveryBand {
  const t = THRESHOLDS[bias];
  const score = clamp(recovery.recoveryScore, 0, 100);
  if (score >= t.green) return "green";
  if (score >= t.amber) return "amber";
  return "red";
}

/**
 * Pick the planned branch matching the day's recovery band. Falls back gracefully
 * to the nearest safer branch if the exact band wasn't authored.
 */
export function selectBranch(
  branches: SessionBranch[],
  band: RecoveryBand,
): SessionBranch | undefined {
  const exact = branches.find((b) => b.band === band);
  if (exact) return exact;
  // Prefer a safer branch over a harder one when the exact band is missing.
  const order: RecoveryBand[] = band === "green" ? ["green", "amber", "red"] : band === "amber" ? ["amber", "red", "green"] : ["red", "amber", "green"];
  for (const b of order) {
    const found = branches.find((x) => x.band === b);
    if (found) return found;
  }
  return branches[0];
}

/** Human-facing verdict word per band. */
export const VERDICT: Record<RecoveryBand, { word: string; tone: string }> = {
  green: { word: "READY", tone: "Well recovered — good day for a fuller session." },
  amber: { word: "EASE OFF", tone: "Moderate — train, but trim the ambition." },
  red: { word: "RECOVER", tone: "Low — today's win is recovery, not load." },
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
