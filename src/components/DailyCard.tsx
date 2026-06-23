"use client";

import Link from "next/link";
import { CardBody, CardFooter, Chip, Button, Accordion, AccordionItem } from "@heroui/react";
import { Play, Repeat, CalendarClock, Clock, Flame, Info, ShieldAlert, Link2, Waves, Dumbbell, MoonStar } from "lucide-react";
import type { RecoveryBand } from "@/core/types";
import type { CardState } from "@/lib/today";
import { SurfaceCard } from "./ui/SurfaceCard";
import { RecoveryRing } from "./RecoveryRing";
import { ExerciseList } from "./ExerciseList";

const BAND_STYLES: Record<RecoveryBand, { band: string; word: string; chip: "success" | "warning" | "danger" }> = {
  green: { band: "bg-success-50 border-success/30", word: "text-success-400", chip: "success" },
  amber: { band: "bg-warning-50 border-warning/30", word: "text-warning-400", chip: "warning" },
  red: { band: "bg-danger-50 border-danger/30", word: "text-danger-400", chip: "danger" },
};
const BRANCH_LABEL: Record<RecoveryBand, string> = { green: "Primary", amber: "Lighter", red: "Recovery" };

export function DailyCard({ state }: { state: CardState }) {
  if (state.kind === "no-connection") {
    return (
      <SurfaceCard>
        <CardBody className="items-center gap-3 p-6 text-center">
          <Link2 className="text-primary-400" size={28} />
          <h2 className="text-lg font-semibold">Connect your WHOOP</h2>
          <p className="max-w-xs text-sm text-foreground-600">
            Your daily training call is read from your morning recovery. Connect WHOOP to begin.
          </p>
          <Button as={Link} href="/api/whoop/connect" color="primary" className="mt-1 font-semibold">
            Connect WHOOP
          </Button>
        </CardBody>
      </SurfaceCard>
    );
  }

  if (state.kind === "rest-day") {
    return (
      <SurfaceCard>
        <CardBody className="items-center gap-3 p-6 text-center">
          <MoonStar className="text-foreground-500" size={28} />
          <h2 className="text-lg font-semibold">Rest day</h2>
          <p className="max-w-xs text-sm text-foreground-600">
            Nothing scheduled today — recovery is part of the plan. Check the Week tab to adjust your sessions.
          </p>
          <Button as={Link} href="/week" variant="bordered" size="sm">
            Open Week
          </Button>
        </CardBody>
      </SurfaceCard>
    );
  }

  if (state.kind === "awaiting-recovery") {
    return (
      <SurfaceCard>
        <CardBody className="gap-4 p-5">
          <div className="flex items-center gap-4 rounded-2xl border border-divider bg-content2 p-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-default-100 font-mono text-2xl text-foreground-500">
              —
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-500">Today&apos;s readiness</p>
              <p className="text-2xl font-bold text-foreground-600">AWAITING RECOVERY</p>
              <p className="mt-0.5 text-sm text-foreground-500">WHOOP usually posts your recovery by ~07:00. Your plan is ready below.</p>
            </div>
          </div>
          {state.focus && (
            <p className="text-sm text-foreground-600">
              Planned: <span className="font-medium text-foreground">{state.focus}</span>{" "}
              {state.type === "swim" ? "(swim)" : "(gym)"}
            </p>
          )}
        </CardBody>
      </SurfaceCard>
    );
  }

  const d = state.data;
  const s = BAND_STYLES[d.band];

  return (
    <SurfaceCard>
      <CardBody className="gap-5 p-5">
        {/* Verdict band — hero */}
        <div className={`flex items-center gap-4 rounded-2xl border p-5 ${s.band}`}>
          <RecoveryRing score={d.recoveryScore} band={d.band} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-500">Today&apos;s readiness</p>
            <p className={`text-3xl font-bold ${s.word}`}>{d.verdictWord}</p>
            <p className="mt-0.5 text-sm leading-snug text-foreground-600">{d.verdictTone}</p>
          </div>
        </div>

        {/* Session line */}
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-500">Today&apos;s session</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-foreground">{d.focus}</span>
            <Chip size="sm" variant="flat" startContent={d.sessionType === "swim" ? <Waves size={13} /> : <Dumbbell size={13} />}>
              {d.sessionType === "swim" ? "Swim" : "Gym"}
            </Chip>
            <Chip size="sm" variant="flat" color={s.chip}>{BRANCH_LABEL[d.band]}</Chip>
            <Chip size="sm" variant="flat" startContent={<Clock size={13} />} className="font-mono">
              {d.durationMin} min
            </Chip>
          </div>
        </div>

        {/* Fuel line */}
        <div className="flex items-start gap-2 rounded-xl bg-content2 p-3">
          <Flame size={16} className="mt-0.5 text-foreground-500" aria-hidden />
          <p className="text-sm text-foreground-600">
            <span className="font-mono text-foreground">~{d.fuel.calories} kcal</span> ·{" "}
            <span className="font-mono text-foreground">{d.fuel.proteinG}g protein</span>
            {d.fuel.preCarbG > 0 && (
              <> · pre-lift <span className="font-mono text-foreground">~{d.fuel.preCarbG}g carbs</span></>
            )}
          </p>
        </div>

        {/* Why / Watch-outs */}
        <Accordion variant="splitted" selectionMode="multiple" className="px-0" defaultExpandedKeys={["watchouts"]}>
          <AccordionItem key="why" aria-label="Why this" title={<span className="text-sm">Why this?</span>} startContent={<Info size={16} className="text-foreground-500" />} classNames={{ content: "text-sm text-foreground-600" }}>
            <ul className="ml-1 list-disc space-y-1 pl-4">
              {d.why.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AccordionItem>
          <AccordionItem key="watchouts" aria-label="Watch-outs" title={<span className="text-sm">Watch-outs</span>} startContent={<ShieldAlert size={16} className="text-danger-400" />} classNames={{ content: "text-sm text-foreground-600" }}>
            <ul className="ml-1 list-disc space-y-1 pl-4">
              {d.watchouts.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AccordionItem>
        </Accordion>

        {/* Exercises */}
        <div>
          <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-500">
            Exercises · {d.exercises.length}
          </p>
          <ExerciseList exercises={d.exercises} />
        </div>
      </CardBody>

      <CardFooter className="ws-surface-highlight sticky bottom-16 z-10 flex flex-col gap-2 border-t border-divider bg-content1 p-5">
        <Button color="primary" size="lg" className="w-full font-semibold" startContent={<Play size={18} />}>
          {d.band === "red" ? "Start recovery" : d.sessionType === "swim" ? "Start swim" : "Start session"}
        </Button>
        <div className="flex w-full gap-2">
          <Button variant="bordered" size="md" className="flex-1 text-foreground-600" startContent={<Repeat size={15} />}>
            Swap
          </Button>
          <Button as={Link} href="/week" variant="light" size="md" className="flex-1 text-foreground-600" startContent={<CalendarClock size={15} />}>
            Reschedule
          </Button>
        </div>
      </CardFooter>
    </SurfaceCard>
  );
}
