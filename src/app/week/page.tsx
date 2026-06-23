import { WeeklyPlanView } from "@/components/WeeklyPlanView";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { ensureSchedule } from "@/lib/plan/store";
import type { ScheduleSlot } from "@/core/schedule";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  let slots: ScheduleSlot[] = [];
  try {
    slots = await ensureSchedule(getSupabaseAdmin(), getOwnerId());
  } catch {
    slots = [];
  }
  return <WeeklyPlanView slots={slots} />;
}
