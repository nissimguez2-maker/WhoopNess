"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, Chip, Button, Checkbox, Input, Accordion, AccordionItem, Divider } from "@heroui/react";
import { Flame, Snowflake, Dumbbell, Waves, RefreshCw, CheckCircle2, Beef } from "lucide-react";
import type { DaySession, LoggedExercise, RecoveryBand } from "@/core/types";
import { SurfaceCard } from "./ui/SurfaceCard";
import { logTodaySession } from "@/app/today/actions";
import { proteinOptionsFor } from "@/core/protein";

const BAND_CHIP: Record<RecoveryBand, "success" | "warning" | "danger"> = { green: "success", amber: "warning", red: "danger" };

interface Row {
  done: boolean;
  weightKg: string;
  reps: string;
  durationMin: string;
}

export function SessionChecklist({
  session,
  onRegenerate,
  regenBusy,
}: {
  session: DaySession;
  onRegenerate: () => void;
  regenBusy: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(
    session.exercises.map((e) => ({
      done: false,
      weightKg: e.loadKg != null ? String(e.loadKg) : "",
      reps: "",
      durationMin: e.durationMin != null ? String(e.durationMin) : "",
    })),
  );
  const [logged, setLogged] = useState(false);
  const [saving, setSaving] = useState(false);

  function patch(i: number, p: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
  }

  async function logSession() {
    setSaving(true);
    const exercises: LoggedExercise[] = session.exercises.map((e, i) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      done: rows[i]!.done,
      weightKg: rows[i]!.weightKg ? Number(rows[i]!.weightKg) : undefined,
      reps: rows[i]!.reps ? Number(rows[i]!.reps) : undefined,
      durationMin: rows[i]!.durationMin ? Number(rows[i]!.durationMin) : undefined,
    }));
    const res = await logTodaySession({ date: session.date, type: session.type, exercises });
    setSaving(false);
    if (res.ok) setLogged(true);
  }

  const protein = proteinOptionsFor(session.proteinTargetG);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <SurfaceCard>
        <CardBody className="gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant="flat" startContent={session.type === "swim" ? <Waves size={14} /> : <Dumbbell size={14} />}>
              {session.type === "swim" ? "Swim" : session.isFallbackWalk ? "Walk" : "Gym"}
            </Chip>
            {session.band && (
              <Chip size="sm" variant="flat" color={BAND_CHIP[session.band]}>
                {session.recoveryScore != null ? `Recovery ${session.recoveryScore}%` : session.band}
              </Chip>
            )}
            <Button size="sm" variant="light" className="ml-auto text-foreground-500" startContent={<RefreshCw size={14} />} onPress={onRegenerate} isLoading={regenBusy}>
              Regenerate
            </Button>
          </div>
          <p className="text-sm text-foreground-600">{session.rationale}</p>
        </CardBody>
      </SurfaceCard>

      {/* Warm-up */}
      <BulletCard icon={<Flame size={16} className="text-warning-400" />} title="Warm-up" bullets={session.warmup} />

      {/* Exercises checklist */}
      <SurfaceCard>
        <CardHeader className="pb-0">
          <h2 className="text-base font-semibold">Today&apos;s exercises</h2>
        </CardHeader>
        <CardBody className="gap-1 p-3">
          {session.exercises.map((e, i) => {
            const isCardio = e.durationMin != null;
            return (
              <div key={`${e.exerciseId}-${i}`} className="rounded-xl px-2 py-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox isSelected={rows[i]!.done} onValueChange={(v) => patch(i, { done: v })} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{e.name}</span>
                      <Chip size="sm" variant="flat" className="font-mono text-[11px]">
                        {isCardio ? `${e.durationMin} min` : `${e.sets} × ${e.reps}`}
                      </Chip>
                    </div>
                    {/* actual inputs */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {isCardio ? (
                        <Input size="sm" type="number" label="Minutes" value={rows[i]!.durationMin} onValueChange={(v) => patch(i, { durationMin: v })} className="max-w-[120px]" />
                      ) : (
                        <>
                          <Input size="sm" type="number" label="kg" value={rows[i]!.weightKg} onValueChange={(v) => patch(i, { weightKg: v })} className="max-w-[100px]" />
                          <Input size="sm" type="number" label="reps" value={rows[i]!.reps} onValueChange={(v) => patch(i, { reps: v })} className="max-w-[100px]" />
                        </>
                      )}
                    </div>
                    {/* how-to */}
                    {e.cues.length > 0 && (
                      <Accordion isCompact className="px-0" itemClasses={{ trigger: "py-1.5", title: "text-xs text-foreground-500" }}>
                        <AccordionItem key="how" aria-label="How to" title="How to do it safely">
                          <ul className="ml-1 list-disc space-y-1 pl-4 text-xs text-foreground-600">
                            {e.cues.map((c, ci) => (
                              <li key={ci}>{c}</li>
                            ))}
                          </ul>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                </div>
                {i < session.exercises.length - 1 && <Divider className="mt-2 bg-divider" />}
              </div>
            );
          })}
        </CardBody>
      </SurfaceCard>

      {/* Cool-down */}
      <BulletCard icon={<Snowflake size={16} className="text-primary-400" />} title="Cool-down" bullets={session.cooldown} />

      {/* Protein options */}
      <SurfaceCard>
        <CardBody className="p-4">
          <Accordion className="px-0" itemClasses={{ trigger: "py-1" }}>
            <AccordionItem
              key="protein"
              aria-label="Protein options"
              startContent={<Beef size={16} className="text-foreground-500" />}
              title={<span className="text-sm">Protein today · ~{session.proteinTargetG}g</span>}
            >
              <ul className="ml-1 list-disc space-y-1 pl-4 text-sm text-foreground-600">
                {protein.options.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-foreground-500">Kosher — no option mixes meat with dairy.</p>
            </AccordionItem>
          </Accordion>
        </CardBody>
      </SurfaceCard>

      {/* Log */}
      <Button color="primary" size="lg" className="font-semibold" onPress={logSession} isLoading={saving} isDisabled={logged} startContent={logged ? <CheckCircle2 size={18} /> : undefined}>
        {logged ? "Logged ✓" : "Log session"}
      </Button>
      {logged && <p className="text-center text-xs text-foreground-500">Saved — the coach will use this for your next session.</p>}
    </div>
  );
}

function BulletCard({ icon, title, bullets }: { icon: React.ReactNode; title: string; bullets: string[] }) {
  return (
    <SurfaceCard>
      <CardBody className="gap-1.5 p-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-500">{title}</span>
        </div>
        <ul className="ml-1 list-disc space-y-1 pl-4 text-sm text-foreground-600">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </CardBody>
    </SurfaceCard>
  );
}
