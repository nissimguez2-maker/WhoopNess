import type { RecoveryBand, RecoveryReading } from "@/core/types";
import { selectBand } from "@/core/recovery";

export const DEFAULT_BODYWEIGHT = 78;

export interface OwnerProfile {
  bodyweightKg: number;
}

/** Recovery band (or null when no recovery has posted yet). */
export function bandFor(recovery: RecoveryReading | null): RecoveryBand | null {
  return recovery ? selectBand(recovery, "standard") : null;
}
