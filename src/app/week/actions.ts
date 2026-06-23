"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { updateSlot } from "@/lib/plan/store";
import type { SessionType } from "@/core/types";

export type SlotUpdateResult = { ok: true } | { ok: false; error: string };

/** Update a schedule slot's day / time / type. */
export async function updateScheduleSlot(input: { id: string; day: string; time: string; type: SessionType }): Promise<SlotUpdateResult> {
  try {
    await updateSlot(getSupabaseAdmin(), getOwnerId(), input.id, { day: input.day, time: input.time, type: input.type });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save." };
  }
}
