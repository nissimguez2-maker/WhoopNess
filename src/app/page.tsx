import Link from "next/link";
import { Chip } from "@heroui/react";
import { Link2, CheckCircle2 } from "lucide-react";
import { DailyCard } from "@/components/DailyCard";
import { KeystoneStatus } from "@/components/KeystoneStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Wordmark } from "@/components/ui/Wordmark";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { isWhoopConnected, getOwnerRecovery, getOwnerWhoopFeatures } from "@/lib/whoop/sync";
import { ensureWeeklyPlan, getTodaySession } from "@/lib/plan/store";
import { buildTodayCardState, type CardState, type OwnerProfile } from "@/lib/today";
import type { TaperStage } from "@/core/fueling";

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ whoop?: string }> }) {
  const sp = await searchParams;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  let state: CardState = { kind: "no-connection" };
  let whoopConnected = false;

  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    await ensureUserBootstrap(admin, ownerId);

    whoopConnected = await isWhoopConnected(ownerId);
    const [recovery, features, profileRow] = await Promise.all([
      getOwnerRecovery(ownerId),
      whoopConnected ? getOwnerWhoopFeatures(ownerId) : Promise.resolve(undefined),
      admin.from("profile").select("bodyweight_kg, glp1_stage").eq("user_id", ownerId).maybeSingle(),
    ]);

    const plan = await ensureWeeklyPlan(admin, ownerId, features);
    const session = getTodaySession(plan);

    const profile: OwnerProfile = {
      bodyweightKg: Number(profileRow.data?.bodyweight_kg ?? 78),
      taper: (profileRow.data?.glp1_stage as TaperStage) ?? "tapering",
    };

    state = buildTodayCardState({ whoopConnected, recovery, session, profile });
  } catch {
    state = { kind: "no-connection" };
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={<Wordmark />}
        subtitle={today}
        action={
          whoopConnected ? (
            <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle2 size={13} />}>
              WHOOP
            </Chip>
          ) : (
            <a href="/api/whoop/connect" className="flex items-center gap-1 whitespace-nowrap text-xs text-primary-400">
              <Link2 size={14} /> Connect WHOOP
            </a>
          )
        }
      />

      {sp.whoop === "connected" && (
        <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-400">WHOOP connected — your data will sync shortly.</div>
      )}
      {sp.whoop === "error" && (
        <div className="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-400">Couldn&apos;t connect WHOOP. Try again.</div>
      )}

      {whoopConnected && <KeystoneStatus wornLastNight={state.kind === "ready"} />}
      <DailyCard state={state} />
      <Link href="/week" className="text-center text-xs text-foreground-500">
        The week is the plan — view &amp; edit your sessions →
      </Link>
    </div>
  );
}
