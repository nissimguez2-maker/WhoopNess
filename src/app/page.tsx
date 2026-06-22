import { Chip } from "@heroui/react";
import { LogOut, Link2, CheckCircle2 } from "lucide-react";
import { DailyCard } from "@/components/DailyCard";
import { KeystoneStatus } from "@/components/KeystoneStatus";
import { buildTodayCard } from "@/lib/mock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let whoopConnected = false;
  if (user) {
    try {
      await ensureUserBootstrap(supabase, user);
      whoopConnected = await hasWhoopConnection(user.id);
    } catch {
      // best-effort; the card still renders
    }
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
        <div className="flex items-center gap-2">
          {whoopConnected ? (
            <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle2 size={13} />}>
              WHOOP
            </Chip>
          ) : (
            <a href="/api/whoop/connect" className="flex items-center gap-1 text-xs text-primary-400">
              <Link2 size={14} /> Connect WHOOP
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button type="submit" aria-label="Sign out" className="text-foreground-500 hover:text-foreground">
              <LogOut size={16} />
            </button>
          </form>
        </div>
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
