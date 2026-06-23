import type { WhoopFeatures } from "@/core/types";
import type { RecoveryPoint, StrainPoint, SleepPoint } from "./client";

/**
 * Turn raw WHOOP windows into the compact feature set the smart planner reasons about.
 * Pure math — fully testable, no I/O.
 */
export function computeWhoopFeatures(input: {
  recovery: RecoveryPoint[];
  strain: StrainPoint[];
  sleep: SleepPoint[];
  daysSinceGym?: number;
  daysSinceLowerBody?: number;
  daysSinceSwim?: number;
}): WhoopFeatures {
  // Recovery is returned newest-first by WHOOP; sort oldest→newest for slope.
  const rec = [...input.recovery].reverse();
  const scores = rec.map((r) => r.recoveryScore);
  const last7 = scores.slice(-7);

  const latestRecovery = scores.length ? scores[scores.length - 1] : undefined;
  const recovery7dMean = mean(last7);
  const recoverySlope = slope(last7);

  const hrvs = rec.map((r) => r.hrvMs).filter((v): v is number => v != null);
  const hrvBaseline = mean(hrvs);
  const hrvSd = std(hrvs);
  const latestHrv = hrvs.length ? hrvs[hrvs.length - 1] : undefined;
  const hrvDeviationSd =
    hrvBaseline != null && hrvSd != null && hrvSd > 0 && latestHrv != null
      ? round2((latestHrv - hrvBaseline) / hrvSd)
      : undefined;

  const rhrs = rec.map((r) => r.restingHr).filter((v): v is number => v != null);
  const rhrBaseline = mean(rhrs);

  const sleepPct = input.sleep.map((s) => s.performancePct).filter((v): v is number => v != null).slice(0, 7);
  const sleep7dMean = mean(sleepPct);

  // ACWR-like: acute (7d) vs chronic (28d) mean daily strain.
  const strainNewestFirst = input.strain.map((s) => s.strain);
  const acute = mean(strainNewestFirst.slice(0, 7));
  const chronic = mean(strainNewestFirst.slice(0, 28));
  const acwr = acute != null && chronic != null && chronic > 0 ? round2(acute / chronic) : undefined;

  const fatigueState = deriveFatigue({ recovery7dMean, recoverySlope, acwr, hrvDeviationSd });

  return {
    latestRecovery,
    recovery7dMean: round1(recovery7dMean),
    recoverySlope: round2(recoverySlope),
    hrvBaseline: round1(hrvBaseline),
    hrvSd: round1(hrvSd),
    hrvDeviationSd,
    rhrBaseline: round1(rhrBaseline),
    sleep7dMean: round1(sleep7dMean),
    acwr,
    daysSinceGym: input.daysSinceGym,
    daysSinceLowerBody: input.daysSinceLowerBody,
    daysSinceSwim: input.daysSinceSwim,
    fatigueState,
  };
}

function deriveFatigue(f: {
  recovery7dMean?: number;
  recoverySlope?: number;
  acwr?: number;
  hrvDeviationSd?: number;
}): WhoopFeatures["fatigueState"] {
  let score = 0;
  if (f.recovery7dMean != null) {
    if (f.recovery7dMean >= 67) score += 1;
    else if (f.recovery7dMean <= 45) score -= 1;
  }
  if (f.recoverySlope != null) {
    if (f.recoverySlope > 0.5) score += 1;
    else if (f.recoverySlope < -0.5) score -= 1;
  }
  if (f.acwr != null && f.acwr > 1.5) score -= 1;
  if (f.hrvDeviationSd != null) {
    if (f.hrvDeviationSd <= -1) score -= 1;
    else if (f.hrvDeviationSd >= 0.5) score += 1;
  }
  if (score >= 2) return "fresh";
  if (score <= -1) return "strained";
  return "normal";
}

// ── stats helpers ────────────────────────────────────────────────────────────
function mean(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}
function std(xs: number[]): number | undefined {
  const m = mean(xs);
  if (m == null || xs.length < 2) return undefined;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
/** Least-squares slope per index step (per day). */
function slope(xs: number[]): number | undefined {
  const n = xs.length;
  if (n < 2) return undefined;
  const xm = (n - 1) / 2;
  const ym = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (xs[i]! - ym);
    den += (i - xm) ** 2;
  }
  return den === 0 ? undefined : num / den;
}
function round1(n?: number) {
  return n == null ? undefined : Math.round(n * 10) / 10;
}
function round2(n?: number) {
  return n == null ? undefined : Math.round(n * 100) / 100;
}
