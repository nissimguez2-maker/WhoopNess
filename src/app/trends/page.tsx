import { TrendsView } from "@/components/TrendsView";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { getOwnerRecoverySeries } from "@/lib/whoop/sync";
import { loadRecentLogs, loadBodyweightSeries } from "@/lib/plan/store";
import { epley1RM } from "@/core/metrics";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  let recovery: Array<{ date: string; score: number }> = [];
  let strength: Array<{ date: string; e1rm: number }> = [];
  let bodyweight: Array<{ date: string; kg: number }> = [];
  let currentBw: number | undefined;

  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    const [rec, logs, bw, prof] = await Promise.all([
      getOwnerRecoverySeries(ownerId),
      loadRecentLogs(admin, ownerId, 60),
      loadBodyweightSeries(admin, ownerId),
      admin.from("profile").select("bodyweight_kg").eq("user_id", ownerId).maybeSingle(),
    ]);
    recovery = rec;
    bodyweight = bw;
    currentBw = bw.at(-1)?.kg ?? (prof.data?.bodyweight_kg != null ? Number(prof.data.bodyweight_kg) : undefined);

    // Best estimated 1RM per gym session (top set across logged lifts) → a strength line.
    strength = logs
      .filter((l) => l.type === "gym")
      .map((l) => {
        let best = 0;
        for (const e of l.exercises) {
          if (e.weightKg != null && e.reps != null) best = Math.max(best, epley1RM(e.weightKg, e.reps));
        }
        return { date: l.date, e1rm: Math.round(best) };
      })
      .filter((x) => x.e1rm > 0)
      .reverse(); // logs come newest-first; chart wants chronological
  } catch {
    /* honest empty states below */
  }

  return <TrendsView recovery={recovery} strength={strength} bodyweight={bodyweight} currentBodyweight={currentBw} />;
}
