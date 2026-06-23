"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { addWeighIn } from "@/lib/plan/store";
import { todayKey } from "@/lib/date";

export async function logWeighIn(kg: number): Promise<{ ok: boolean }> {
  if (!Number.isFinite(kg) || kg < 30 || kg > 250) return { ok: false };
  try {
    await addWeighIn(getSupabaseAdmin(), getOwnerId(), Math.round(kg * 10) / 10, todayKey());
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
