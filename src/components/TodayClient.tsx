"use client";

import Link from "next/link";
import { useState } from "react";
import { CardBody, Button } from "@heroui/react";
import { Dumbbell, Waves, Footprints, Sparkles, Link2, MoonStar } from "lucide-react";
import type { DaySession, RecoveryBand, SessionType } from "@/core/types";
import { SurfaceCard } from "./ui/SurfaceCard";
import { SessionChecklist } from "./SessionChecklist";
import { generateTodaySession } from "@/app/today/actions";

export function TodayClient({
  whoopConnected,
  slotType,
  initialSession,
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

  if (session) {
    return <SessionChecklist session={session} onRegenerate={() => generate(Boolean(session.isFallbackWalk))} regenBusy={busy !== ""} />;
  }

  if (!whoopConnected) {
    return (
      <SurfaceCard>
        <CardBody className="items-center gap-3 p-6 text-center">
          <Link2 className="text-primary-400" size={28} />
          <h2 className="text-lg font-semibold">Connect your WHOOP</h2>
          <p className="max-w-xs text-sm text-foreground-600">Sessions are tuned to your morning recovery. Connect WHOOP to begin.</p>
          <Button as={Link} href="/api/whoop/connect" color="primary" className="mt-1 font-semibold">
            Connect WHOOP
          </Button>
        </CardBody>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard>
      <CardBody className="items-center gap-3 p-6 text-center">
        {slotType === "swim" ? (
          <Waves className="text-primary-400" size={28} />
        ) : slotType === "gym" ? (
          <Dumbbell className="text-primary-400" size={28} />
        ) : (
          <MoonStar className="text-foreground-500" size={28} />
        )}
        <h2 className="text-lg font-semibold">
          {slotType === "swim" ? "Swim day" : slotType === "gym" ? "Gym day" : "Rest day"}
        </h2>
        <p className="max-w-xs text-sm text-foreground-600">
          {slotType
            ? "Generate today's session — tuned to your live WHOOP recovery and your recent training."
            : "Nothing scheduled today. Fancy a walk, or check the Week tab to adjust your days."}
        </p>

        {slotType && (
          <Button color="primary" size="lg" className="mt-1 w-full font-semibold" startContent={<Sparkles size={18} />} onPress={() => generate(false)} isLoading={busy === "session"}>
            Generate today&apos;s {slotType} session
          </Button>
        )}

        <Button variant="bordered" size={slotType ? "sm" : "lg"} className="w-full" startContent={<Footprints size={16} />} onPress={() => generate(true)} isLoading={busy === "walk"}>
          {slotType ? "Can't make the gym/pool? 1-hour city walk" : "Generate a 1-hour city walk"}
        </Button>

        {!slotType && (
          <Button as={Link} href="/week" variant="light" size="sm">
            Open Week
          </Button>
        )}
        {error && <p className="text-sm text-danger-400">{error}</p>}
      </CardBody>
    </SurfaceCard>
  );
}
