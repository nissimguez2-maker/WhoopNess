import Link from "next/link";
import { Chip } from "@heroui/react";
import { Link2, CheckCircle2 } from "lucide-react";
import { TodayClient } from "@/components/TodayClient";
import { KeystoneStatus } from "@/components/KeystoneStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Wordmark } from "@/components/ui/Wordmark";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { isWhoopConnected, getOwnerRecovery } from "@/lib/whoop/sync";
import { ensureSchedule, loadDaySession } from "@/lib/plan/store";
import { bandFor } from "@/lib/today";
import { todaySlot } from "@/core/schedule";
import type { DaySession, RecoveryBand, SessionType } from "@/core/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  let whoopConnected = false;
  let slotType: SessionType | null = null;
  let initialSession: DaySession | null = null;
  let recoveryScore: number | undefined;
  let band: RecoveryBand | null = null;

  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    await ensureUserBootstrap(admin, ownerId);
    whoopConnected = await isWhoopConnected(ownerId);

    const [schedule, recovery] = await Promise.all([ensureSchedule(admin, ownerId), getOwnerRecovery(ownerId)]);
    slotType = todaySlot(schedule)?.type ?? null;
    recoveryScore = recovery?.recoveryScore;
    band = bandFor(recovery);
    initialSession = await loadDaySession(admin, ownerId, new Date().toISOString().slice(0, 10));
  } catch {
    whoopConnected = false;
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

      {whoopConnected && <KeystoneStatus wornLastNight={recoveryScore != null} />}

      <TodayClient
        whoopConnected={whoopConnected}
        slotType={slotType}
        initialSession={initialSession}
        recoveryScore={recoveryScore}
        band={band}
      />

      <Link href="/week" className="text-center text-xs text-foreground-500">
        Your week: 1 swim, 2 gym. Tap to set days and times →
      </Link>
    </div>
  );
}
