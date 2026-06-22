import { Chip } from "@heroui/react";
import { Link2, CheckCircle2 } from "lucide-react";
import { DailyCard } from "@/components/DailyCard";
import { KeystoneStatus } from "@/components/KeystoneStatus";
import { buildTodayCard } from "@/lib/mock";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { hasWhoopConnection } from "@/lib/whoop/tokens";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ whoop?: string }>;
}) {
  const sp = await searchParams;
  const card = buildTodayCard();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  let whoopConnected = false;
  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();
    await ensureUserBootstrap(admin, ownerId);
    whoopConnected = await hasWhoopConnection(ownerId);
  } catch {
    // DB/env not ready — the card still renders on the engine.
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Whoop<span className="text-primary-400">Ness</span>
          </h1>
          <p className="text-xs text-foreground-500">{today}</p>
        </div>
        {whoopConnected ? (
          <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle2 size={13} />}>
            WHOOP
          </Chip>
        ) : (
          <a href="/api/whoop/connect" className="flex items-center gap-1 text-xs text-primary-400">
            <Link2 size={14} /> Connect WHOOP
          </a>
        )}
      </header>

      {sp.whoop === "connected" && (
        <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-400">WHOOP connected — your data will sync shortly.</div>
      )}
      {sp.whoop === "error" && (
        <div className="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-400">Couldn&apos;t connect WHOOP. Try again.</div>
      )}

      <KeystoneStatus wornLastNight nightsWorn={5} ofNights={7} />
      <DailyCard data={card} />
    </div>
  );
}
