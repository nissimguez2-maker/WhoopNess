import type { RecoveryReading, WhoopFeatures } from "@/core/types";
import { getValidAccessToken } from "./tokens";
import { fetchLatestRecovery, fetchRecoveryRange, fetchStrainRange, fetchSleepRange } from "./client";
import { computeWhoopFeatures } from "./features";

/** Latest recovery for the owner, or null if not connected / no data yet. */
export async function getOwnerRecovery(userId: string): Promise<RecoveryReading | null> {
  try {
    const token = await getValidAccessToken(userId);
    if (!token) return null;
    return await fetchLatestRecovery(token);
  } catch {
    return null;
  }
}

/** WHOOP-derived features for the smart planner, or undefined if unavailable. */
export async function getOwnerWhoopFeatures(userId: string): Promise<WhoopFeatures | undefined> {
  try {
    const token = await getValidAccessToken(userId);
    if (!token) return undefined;
    const [recovery, strain, sleep] = await Promise.all([
      fetchRecoveryRange(token, 28),
      fetchStrainRange(token, 28),
      fetchSleepRange(token, 28),
    ]);
    return computeWhoopFeatures({ recovery, strain, sleep });
  } catch {
    return undefined;
  }
}

/** Recent recovery series (oldest→newest) for the Trends chart, or [] if unavailable. */
export async function getOwnerRecoverySeries(userId: string): Promise<Array<{ date: string; score: number }>> {
  try {
    const token = await getValidAccessToken(userId);
    if (!token) return [];
    const r = await fetchRecoveryRange(token, 28);
    return r.map((x) => ({ date: x.date, score: x.recoveryScore })).reverse();
  } catch {
    return [];
  }
}

export async function isWhoopConnected(userId: string): Promise<boolean> {
  try {
    return (await getValidAccessToken(userId)) != null;
  } catch {
    return false;
  }
}
