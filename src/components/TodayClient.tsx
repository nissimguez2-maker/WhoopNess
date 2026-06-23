"use client";

import Link from "next/link";
import { useState } from "react";
import { CardBody, Button } from "@heroui/react";
import { Dumbbell, Waves, Footprints, Link2, MoonStar } from "lucide-react";
import type { DaySession, RecoveryBand, SessionType } from "@/core/types";
import { VERDICT } from "@/core/recovery";
import { SurfaceCard } from "./ui/SurfaceCard";
import { RecoveryRing } from "./RecoveryRing";
import { SessionChecklist } from "./SessionChecklist";
import { generateTodaySession } from "@/app/today/actions";

const VERDICT_TEXT: Record<RecoveryBand, string> = {
  green: "text-success-400",
  amber: "text-warning-400",
  red: "text-danger-400",
};

function RecoveryHero({ score, band }: { score: number; band: RecoveryBand }) {
  const v = VERDICT[band];
  return (
    <SurfaceCard>
      <CardBody className="flex-row items-center gap-4 p-5">
        <RecoveryRing score={score} band={band} />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-500">Today&apos;s recovery</div>
          <div className={`text-2xl font-bold leading-tight ${VERDICT_TEXT[band]}`}>{v.word}</div>
          <p className="mt-0.5 text-sm text-foreground-600">{v.tone}</p>
        </div>
      </CardBody>
    </SurfaceCard>
  );
}

export function TodayClient({
  whoopConnected,
  slotType,
  initialSession,
  recoveryScore,
  band,
}: {
  whoopConnected: boolean;
  slotType: SessionType | null;
  initialSession: DaySession | null;
  recoveryScore?: number;
  band?: RecoveryBand | null;
}) {
  const [session, setSession] = useState<DaySession | null>(initialSession);
  const [busy, setBusy] = useState<"" | "session" | "walk">("");
  const [error, setError] = useState<string | null>(null);

  async function generate(fallbackWalk: boolean) {
    setBusy(fallbackWalk ? "walk" : "session");
    setError(null);
    const res = await generateTodaySession(fallbackWalk ? { fallbackWalk: true } : undefined);
    setBusy("");
    if (res.ok) setSession(res.session);
    else setError(res.error);
  }

  const hero = band != null && recoveryScore != null ? <RecoveryHero score={recoveryScore} band={band} /> : null;

  if (session) {
    return (
      <div className="flex flex-col gap-4">
        {hero}
        <SessionChecklist session={session} onRegenerate={() => generate(Boolean(session.isFallbackWalk))} regenBusy={busy !== ""} />
      </div>
    );
  }

  if (!whoopConnected) {
    return (
      <SurfaceCard>
        <CardBody className="items-center gap-3 p-6 text-center">
          <Link2 className="text-primary" size={28} />
          <h2 className="text-lg font-semibold">Connect your WHOOP</h2>
          <p className="max-w-xs text-sm text-foreground-600">I tune each session to your morning recovery. Connect WHOOP to start.</p>
          <Button as={Link} href="/api/whoop/connect" color="primary" className="mt-1 font-semibold">
            Connect WHOOP
          </Button>
        </CardBody>
      </SurfaceCard>
    );
  }

  const SlotIcon = slotType === "swim" ? Waves : slotType === "gym" ? Dumbbell : MoonStar;

  return (
    <div className="flex flex-col gap-4">
      {hero}
      <SurfaceCard>
        <CardBody className="items-center gap-3 p-6 text-center">
          <SlotIcon className={slotType ? "text-primary" : "text-foreground-500"} size={28} />
          <h2 className="text-lg font-semibold">{slotType === "swim" ? "Swim day" : slotType === "gym" ? "Gym day" : "Rest day"}</h2>
          <p className="max-w-xs text-sm text-foreground-600">
            {slotType
              ? "I'll build today's session from your recovery and what you've done lately."
              : "Nothing scheduled today. Go for a walk, or set your days in the Week tab."}
          </p>

          {slotType && (
            <Button color="primary" size="lg" className="mt-1 w-full font-semibold" startContent={<SlotIcon size={18} />} onPress={() => generate(false)} isLoading={busy === "session"}>
              Build today&apos;s {slotType} session
            </Button>
          )}

          <Button variant="bordered" size={slotType ? "sm" : "lg"} className="w-full" startContent={<Footprints size={16} />} onPress={() => generate(true)} isLoading={busy === "walk"}>
            {slotType ? "Can't make it? 1-hour city walk" : "Plan a 1-hour city walk"}
          </Button>

          {!slotType && (
            <Button as={Link} href="/week" variant="light" size="sm">
              Open Week
            </Button>
          )}
          {error && <p className="text-sm text-danger-400">{error}</p>}
        </CardBody>
      </SurfaceCard>
    </div>
  );
}
