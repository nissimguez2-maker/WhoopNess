"use client";

import {
  Card,
  CardBody,
  CardFooter,
  Chip,
  Button,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { Play, Repeat, CalendarClock, Clock, Flame, Info, ShieldAlert } from "lucide-react";
import type { RecoveryBand } from "@/core/types";
import type { TodayCard } from "@/lib/mock";
import { RecoveryRing } from "./RecoveryRing";

const BAND_STYLES: Record<RecoveryBand, { band: string; word: string; chip: "success" | "warning" | "danger" }> = {
  green: { band: "bg-success-50 border-success/30", word: "text-success-400", chip: "success" },
  amber: { band: "bg-warning-50 border-warning/30", word: "text-warning-400", chip: "warning" },
  red: { band: "bg-danger-50 border-danger/30", word: "text-danger-400", chip: "danger" },
};

const BRANCH_LABEL: Record<RecoveryBand, string> = { green: "Primary", amber: "Lighter", red: "Recovery" };

export function DailyCard({ data }: { data: TodayCard }) {
  const s = BAND_STYLES[data.band];

  return (
    <Card className="ws-surface-highlight border border-white/10 bg-content1" radius="lg" shadow="sm">
      <CardBody className="gap-4 p-4">
        {/* Verdict band — color + word + icon, never color alone */}
        <div className={`flex items-center gap-4 rounded-2xl border p-4 ${s.band}`}>
          <RecoveryRing score={data.recoveryScore} band={data.band} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-500">
              Today&apos;s readiness
            </p>
            <p className={`text-2xl font-bold ${s.word}`}>{data.verdictWord}</p>
            <p className="mt-0.5 text-sm text-foreground-600">{data.verdictTone}</p>
          </div>
        </div>

        {/* Session line */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-500">Today&apos;s session</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-foreground">{data.focus}</span>
            <Chip size="sm" variant="flat" color={s.chip}>{BRANCH_LABEL[data.band]}</Chip>
            <Chip size="sm" variant="flat" startContent={<Clock size={13} />} className="font-mono">
              {data.durationMin} min
            </Chip>
          </div>
        </div>

        {/* Fuel line */}
        <div className="flex items-start gap-2 rounded-xl bg-content2 p-3">
          <Flame size={16} className="mt-0.5 text-foreground-500" aria-hidden />
          <p className="text-sm text-foreground-600">
            <span className="font-mono text-foreground">~{data.fuel.calories} kcal</span> ·{" "}
            <span className="font-mono text-foreground">{data.fuel.proteinG}g protein</span>
            {data.fuel.preCarbG > 0 && (
              <>
                {" "}· pre-lift <span className="font-mono text-foreground">~{data.fuel.preCarbG}g carbs</span>
              </>
            )}
          </p>
        </div>

        {/* Expandable: Why + Watch-outs + exercises */}
        <Accordion variant="splitted" selectionMode="multiple" className="px-0" defaultExpandedKeys={["watchouts"]}>
          <AccordionItem
            key="why"
            aria-label="Why this recommendation"
            title={<span className="text-sm">Why this?</span>}
            startContent={<Info size={16} className="text-foreground-500" />}
            classNames={{ content: "text-sm text-foreground-600" }}
          >
            <ul className="ml-1 list-disc space-y-1 pl-4">
              {data.why.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AccordionItem>

          <AccordionItem
            key="watchouts"
            aria-label="Watch-outs"
            title={<span className="text-sm">Watch-outs</span>}
            startContent={<ShieldAlert size={16} className="text-danger-400" />}
            classNames={{ content: "text-sm text-foreground-600" }}
          >
            <ul className="ml-1 list-disc space-y-1 pl-4">
              {data.watchouts.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AccordionItem>

          <AccordionItem
            key="exercises"
            aria-label="Session exercises"
            title={<span className="text-sm">Exercises ({data.exercises.length})</span>}
            classNames={{ content: "text-sm" }}
          >
            <ul className="space-y-2">
              {data.exercises.map((e, i) => (
                <li key={i} className="flex items-center justify-between border-b border-divider pb-2 last:border-0">
                  <span className="text-foreground">{e.name}</span>
                  <span className="font-mono text-xs text-foreground-500">{e.detail}</span>
                </li>
              ))}
            </ul>
          </AccordionItem>
        </Accordion>
      </CardBody>

      <CardFooter className="ws-surface-highlight sticky bottom-16 z-10 flex flex-col gap-2 border-t border-divider bg-content1 p-4">
        <Button color="primary" size="lg" className="w-full font-semibold" startContent={<Play size={18} />}>
          {data.band === "red" ? "Start recovery" : "Start session"}
        </Button>
        <div className="flex w-full gap-2">
          <Button variant="bordered" size="sm" className="flex-1" startContent={<Repeat size={15} />}>
            Swap
          </Button>
          <Button variant="light" size="sm" className="flex-1" startContent={<CalendarClock size={15} />}>
            Reschedule
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
