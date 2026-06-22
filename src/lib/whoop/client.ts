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
