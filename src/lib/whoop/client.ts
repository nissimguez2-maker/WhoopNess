import type { RecoveryReading } from "@/core/types";

/**
 * Thin WHOOP API v2 client. Read-only. Pass a valid access token (refreshed upstream).
 * Endpoints per https://developer.whoop.com/api
 */
const API_BASE = "https://api.prod.whoop.com/developer";

async function get<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`WHOOP API ${path} → ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

interface WhoopRecoveryRecord {
  score?: {
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

/** Map the latest recovery record into our domain RecoveryReading. */
export async function fetchLatestRecovery(accessToken: string): Promise<RecoveryReading | null> {
  const data = await get<{ records: WhoopRecoveryRecord[] }>("/v2/recovery?limit=1", accessToken);
  const rec = data.records?.[0]?.score;
  if (!rec) return null;
  return {
    recoveryScore: rec.recovery_score,
    restingHr: rec.resting_heart_rate,
    hrvMs: rec.hrv_rmssd_milli,
    spo2: rec.spo2_percentage,
    skinTempC: rec.skin_temp_celsius,
  };
}

export function fetchSleepById(sleepId: string, accessToken: string) {
  return get(`/v2/activity/sleep/${sleepId}`, accessToken);
}

export function fetchWorkoutById(workoutId: string, accessToken: string) {
  return get(`/v2/activity/workout/${workoutId}`, accessToken);
}

// ── Range fetches for the smart planner ──────────────────────────────────────
export interface RecoveryPoint {
  date: string;
  recoveryScore: number;
  hrvMs?: number;
  restingHr?: number;
}
export interface StrainPoint {
  date: string;
  strain: number;
}
export interface SleepPoint {
  date: string;
  performancePct?: number;
}

function sinceParams(days: number): string {
  const start = new Date(Date.now() - days * 86_400_000).toISOString();
  return `start=${encodeURIComponent(start)}&limit=25`;
}

export async function fetchRecoveryRange(accessToken: string, days = 28): Promise<RecoveryPoint[]> {
  const data = await get<{ records: Array<{ created_at?: string; score?: { recovery_score: number; hrv_rmssd_milli?: number; resting_heart_rate?: number } }> }>(
    `/v2/recovery?${sinceParams(days)}`,
    accessToken,
  );
  return (data.records ?? [])
    .filter((r) => r.score)
    .map((r) => ({
      date: r.created_at ?? "",
      recoveryScore: r.score!.recovery_score,
      hrvMs: r.score!.hrv_rmssd_milli,
      restingHr: r.score!.resting_heart_rate,
    }));
}

export async function fetchStrainRange(accessToken: string, days = 28): Promise<StrainPoint[]> {
  const data = await get<{ records: Array<{ start?: string; score?: { strain: number } }> }>(
    `/v2/cycle?${sinceParams(days)}`,
    accessToken,
  );
  return (data.records ?? [])
    .filter((r) => r.score)
    .map((r) => ({ date: r.start ?? "", strain: r.score!.strain }));
}

export async function fetchSleepRange(accessToken: string, days = 28): Promise<SleepPoint[]> {
  const data = await get<{ records: Array<{ start?: string; score?: { sleep_performance_percentage?: number } }> }>(
    `/v2/activity/sleep?${sinceParams(days)}`,
    accessToken,
  );
  return (data.records ?? []).map((r) => ({ date: r.start ?? "", performancePct: r.score?.sleep_performance_percentage }));
}
