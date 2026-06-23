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
import { ensureSchedule, loadDaySession, loadRecentLogs, loadLogForDate } from "@/lib/plan/store";
import { bandFor } from "@/lib/today";
import { todaySlot } from "@/core/schedule";
import { todayKey, todayLabel, todayWeekday } from "@/lib/date";
import type { RecentLogExercise } from "@/lib/plan/generate";
import type { DaySession, LoggedSession, RecoveryBand, SessionType } from "@/core/types";

export const dynamic = "force-dynamic";

/** Short "last performed" string for an exercise, e.g. "60kg×10 @RPE8". */
function fmtLast(e: RecentLogExercise): string {
  const p: string[] = [];
  if (e.weightKg != null) p.push(`${e.weightKg}kg${e.reps != null ? `×${e.reps}` : ""}`);
  else if (e.reps != null) p.push(`×${e.reps}`);
  if (e.rpe != null) p.push(`@RPE${e.rpe}`);
  if (e.durationMin != null) p.push(`${e.durationMin}min`);
  if (e.speedKmh != null) p.push(`${e.speedKmh}km/h`);
  if (e.distanceKm != null) p.push(`${e.distanceKm}km`);
  if (e.distanceM != null) p.push(`${e.distanceM}m`);
  return p.join(" ");
}

export default async function Home() {
  const today = todayLabel();

  let whoopConnected = false;
  let slotType: SessionType | null = null;
  let initialSession: DaySession | null = null;
  let recoveryScore: number | undefined;
  let band: RecoveryBand | null = null;
  let existingLog: LoggedSession | null = null;
  const lastByExercise: Record<string, string> = {};

  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    await ensureUserBootstrap(admin, ownerId);
    whoopConnected = await isWhoopConnected(ownerId);

    const date = todayKey();
    const [schedule, recovery, recentLogs] = await Promise.all([
      ensureSchedule(admin, ownerId),
      getOwnerRecovery(ownerId),
      loadRecentLogs(admin, ownerId, 8),
    ]);
    slotType = todaySlot(schedule, todayWeekday())?.type ?? null;
    recoveryScore = recovery?.recoveryScore;
    band = bandFor(recovery);
    initialSession = await loadDaySession(admin, ownerId, date);

    for (const l of recentLogs) {
      for (const e of l.exercises) {
        if (e.exerciseId && !lastByExercise[e.exerciseId]) {
          const s = fmtLast(e);
          if (s) lastByExercise[e.exerciseId] = s;
        }
      }
    }
    if (initialSession) existingLog = await loadLogForDate(admin, ownerId, date, initialSession.type);
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
        existingLog={existingLog}
        lastByExercise={lastByExercise}
      />

      <Link href="/week" className="text-center text-xs text-foreground-500">
        Your week: 1 swim, 2 gym. Tap to set days and times →
      </Link>
    </div>
  );
}
