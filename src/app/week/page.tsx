import { WeeklyPlanView, type SessionVM } from "@/components/WeeklyPlanView";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { isWhoopConnected, getOwnerWhoopFeatures } from "@/lib/whoop/sync";
import { ensureWeeklyPlan } from "@/lib/plan/store";
import { estimateDurationMin } from "@/core/planner";
import { toExerciseViews } from "@/lib/today";
import type { RecoveryBand } from "@/core/types";

export const dynamic = "force-dynamic";

const LABEL: Record<RecoveryBand, string> = { green: "Primary", amber: "Lighter", red: "Recovery" };

export default async function WeekPage() {
  let sessions: SessionVM[] = [];
  let rationale: string | undefined;
  let weekLabel = "This week";

  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    const features = (await isWhoopConnected(ownerId)) ? await getOwnerWhoopFeatures(ownerId) : undefined;
    const plan = await ensureWeeklyPlan(admin, ownerId, features);
    rationale = plan.rationale;
    weekLabel = `Week of ${new Date(plan.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    sessions = plan.sessions.map((s) => ({
      id: s.id,
      day: s.day,
      time: s.time,
      type: s.type,
      focus: s.focus,
      branches: s.branches.map((b) => ({
        band: b.band,
        label: LABEL[b.band],
        durationMin: estimateDurationMin(b),
        exercises: toExerciseViews(b.exercises),
      })),
    }));
  } catch {
    sessions = [];
  }

  return <WeeklyPlanView sessions={sessions} weekLabel={weekLabel} rationale={rationale} />;
}
