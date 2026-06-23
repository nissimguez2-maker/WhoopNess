"use client";

import { useState, useEffect } from "react";
import { CardBody, CardHeader, Chip, Button, Checkbox, Input, Textarea, Accordion, AccordionItem, Divider } from "@heroui/react";
import { Flame, Snowflake, Dumbbell, Waves, RefreshCw, CheckCircle2, Beef } from "lucide-react";
import type { DaySession, LoggedExercise, LoggedSession, LoggedSet, PainLevel, RecoveryBand } from "@/core/types";
import { SurfaceCard } from "./ui/SurfaceCard";
import { logTodaySession } from "@/app/today/actions";
import { proteinOptionsFor } from "@/core/protein";

const BAND_CHIP: Record<RecoveryBand, "success" | "warning" | "danger"> = { green: "success", amber: "warning", red: "danger" };
const PAIN_LABELS = ["None", "Tight", "Sore", "Sharp"] as const;

type CardioField = { key: keyof LoggedExercise; label: string; step?: string };
const CARDIO_FIELDS: Record<string, CardioField[]> = {
  treadmill_walk: [
    { key: "durationMin", label: "Min" },
    { key: "speedKmh", label: "km/h", step: "0.1" },
    { key: "inclinePct", label: "Incline %", step: "0.5" },
    { key: "distanceKm", label: "Dist km", step: "0.1" },
  ],
  exercise_bike: [
    { key: "durationMin", label: "Min" },
    { key: "resistanceLevel", label: "Level" },
    { key: "distanceKm", label: "Dist km", step: "0.1" },
  ],
  swimming: [
    { key: "durationMin", label: "Min" },
    { key: "distanceM", label: "Dist m", step: "25" },
  ],
  city_walk: [
    { key: "durationMin", label: "Min" },
    { key: "distanceKm", label: "Dist km", step: "0.1" },
  ],
};
function cardioFieldsFor(id: string): CardioField[] {
  return CARDIO_FIELDS[id] ?? [{ key: "durationMin", label: "Min" }];
}

interface Row {
  done: boolean;
  rpe: string;
  sets: { weightKg: string; reps: string }[];
  cardio: Record<string, string>;
}

function seedRows(session: DaySession, existing: LoggedSession | null): Row[] {
  return session.exercises.map((e) => {
    const prev = existing?.exercises.find((x) => x.exerciseId === e.exerciseId);
    if (e.durationMin != null) {
      const cardio: Record<string, string> = {};
      for (const f of cardioFieldsFor(e.exerciseId)) {
        const pv = prev ? (prev[f.key] as number | undefined) : undefined;
        cardio[f.key] = pv != null ? String(pv) : f.key === "durationMin" ? String(e.durationMin) : "";
      }
      return { done: prev?.done ?? false, rpe: "", sets: [], cardio };
    }
    const nSets = Math.max(1, e.sets);
    const sets = Array.from({ length: nSets }, (_, i) => ({
      weightKg: prev?.sets?.[i]?.weightKg != null ? String(prev.sets[i]!.weightKg) : e.loadKg != null ? String(e.loadKg) : "",
      reps: prev?.sets?.[i]?.reps != null ? String(prev.sets[i]!.reps) : "",
    }));
    return { done: prev?.done ?? false, rpe: prev?.rpe != null ? String(prev.rpe) : "", sets, cardio: {} };
  });
}

export function SessionChecklist({
  session,
  existingLog = null,
  lastByExercise = {},
  onRegenerate,
  regenBusy,
}: {
  session: DaySession;
  existingLog?: LoggedSession | null;
  lastByExercise?: Record<string, string>;
  onRegenerate: () => void;
  regenBusy: boolean;
}) {
  const draftKey = `ws-draft-${session.date}-${session.type}`;
  const [rows, setRows] = useState<Row[]>(() => seedRows(session, existingLog));
  const [note, setNote] = useState(existingLog?.note ?? "");
  const [kneePain, setKneePain] = useState<PainLevel>(existingLog?.kneePain ?? 0);
  const [backPain, setBackPain] = useState<PainLevel>(existingLog?.backPain ?? 0);
  const [logged, setLogged] = useState(existingLog != null);
  const [saving, setSaving] = useState(false);

  // Restore an in-progress draft (phone lock / reload) when there's no saved log yet.
  useEffect(() => {
    if (existingLog) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (Array.isArray(d.rows) && d.rows.length === session.exercises.length) {
        setRows(d.rows);
        setNote(d.note ?? "");
        setKneePain(d.kneePain ?? 0);
        setBackPain(d.backPain ?? 0);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft as the user enters numbers.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ rows, note, kneePain, backPain }));
    } catch {
      /* ignore */
    }
  }, [rows, note, kneePain, backPain, draftKey]);

  function patchRow(i: number, p: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
  }
  function patchSet(i: number, si: number, p: Partial<{ weightKg: string; reps: string }>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, sets: row.sets.map((s, sj) => (sj === si ? { ...s, ...p } : s)) } : row)));
  }
  function patchCardio(i: number, key: string, v: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, cardio: { ...row.cardio, [key]: v } } : row)));
  }

  async function logSession() {
    setSaving(true);
    const num = (v: string) => (v ? Number(v) : undefined);
    const exercises: LoggedExercise[] = session.exercises.map((e, i) => {
      const r = rows[i]!;
      if (e.durationMin != null) {
        const c = r.cardio;
        return {
          exerciseId: e.exerciseId,
          name: e.name,
          done: r.done,
          durationMin: num(c.durationMin ?? ""),
          speedKmh: num(c.speedKmh ?? ""),
          inclinePct: num(c.inclinePct ?? ""),
          distanceKm: num(c.distanceKm ?? ""),
          resistanceLevel: num(c.resistanceLevel ?? ""),
          distanceM: num(c.distanceM ?? ""),
        };
      }
      const sets: LoggedSet[] = r.sets
        .map((s) => ({ weightKg: num(s.weightKg), reps: num(s.reps) }))
        .filter((s) => s.weightKg != null || s.reps != null);
      return {
        exerciseId: e.exerciseId,
        name: e.name,
        done: r.done,
        sets,
        weightKg: sets[0]?.weightKg,
        reps: sets[0]?.reps,
        rpe: num(r.rpe),
      };
    });
    const log: LoggedSession = {
      date: session.date,
      type: session.type,
      exercises,
      note: note.trim() || undefined,
      kneePain: kneePain || undefined,
      backPain: backPain || undefined,
    };
    const res = await logTodaySession(log);
    setSaving(false);
    if (res.ok) {
      setLogged(true);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
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
            {session.source === "baseline" && (
              <Chip size="sm" variant="flat" className="text-foreground-500">
                offline plan
              </Chip>
            )}
            <Button size="sm" variant="light" className="ml-auto text-foreground-500" startContent={<RefreshCw size={14} />} onPress={onRegenerate} isLoading={regenBusy}>
              Rebuild
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
            const last = lastByExercise[e.exerciseId];
            return (
              <div key={`${e.exerciseId}-${i}`} className="rounded-xl px-2 py-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox isSelected={rows[i]!.done} onValueChange={(v) => patchRow(i, { done: v })} className="mt-0.5" aria-label={`Did ${e.name}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{e.name}</span>
                      <Chip size="sm" variant="flat" className="font-mono text-[11px]">
                        {isCardio ? `${e.durationMin} min` : `${e.sets} × ${e.reps}`}
                      </Chip>
                    </div>
                    {last && <p className="mt-0.5 text-[11px] text-foreground-500">Last: {last}</p>}

                    {/* actual inputs */}
                    {isCardio ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cardioFieldsFor(e.exerciseId).map((f) => (
                          <Input
                            key={f.key as string}
                            size="sm"
                            type="number"
                            inputMode="decimal"
                            step={f.step}
                            label={f.label}
                            value={rows[i]!.cardio[f.key as string] ?? ""}
                            onValueChange={(v) => patchCardio(i, f.key as string, v)}
                            className="max-w-[96px]"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {rows[i]!.sets.map((s, si) => (
                          <div key={si} className="flex items-center gap-2">
                            <span className="w-8 text-[11px] text-foreground-500">Set {si + 1}</span>
                            <Input size="sm" type="number" inputMode="decimal" step="0.5" label="kg" value={s.weightKg} onValueChange={(v) => patchSet(i, si, { weightKg: v })} className="max-w-[92px]" />
                            <Input size="sm" type="number" inputMode="numeric" label="reps" value={s.reps} onValueChange={(v) => patchSet(i, si, { reps: v })} className="max-w-[92px]" />
                          </div>
                        ))}
                        <Input size="sm" type="number" inputMode="numeric" label="RPE (effort 6-10)" value={rows[i]!.rpe} onValueChange={(v) => patchRow(i, { rpe: v })} className="max-w-[160px]" />
                      </div>
                    )}

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
      <BulletCard icon={<Snowflake size={16} className="text-primary" />} title="Cool-down" bullets={session.cooldown} />

      {/* How the body felt — the safety signal */}
      <SurfaceCard>
        <CardBody className="gap-3 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-500">How did it feel?</span>
          <PainPicker label="Knee" value={kneePain} onChange={setKneePain} />
          <PainPicker label="Back" value={backPain} onChange={setBackPain} />
          <Textarea
            minRows={2}
            value={note}
            onValueChange={setNote}
            placeholder="Anything to remember for next time? (a tweak, an easy/hard set, a niggle…)"
            variant="bordered"
            aria-label="Session note"
            classNames={{ inputWrapper: "bg-content1" }}
          />
        </CardBody>
      </SurfaceCard>

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
              <p className="mt-2 text-[11px] text-foreground-500">Kosher: no option mixes meat with dairy.</p>
            </AccordionItem>
          </Accordion>
        </CardBody>
      </SurfaceCard>

      {/* Log */}
      <Button color="primary" size="lg" className="font-semibold" onPress={logSession} isLoading={saving} startContent={logged ? <CheckCircle2 size={18} /> : undefined}>
        {logged ? "Update log" : "Log session"}
      </Button>
      {logged && <p className="text-center text-xs text-foreground-500">Saved. I&apos;ll use this for next time.</p>}
    </div>
  );
}

function PainPicker({ label, value, onChange }: { label: string; value: PainLevel; onChange: (v: PainLevel) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-sm text-foreground-600">{label}</span>
      <div className="flex gap-1.5" role="group" aria-label={`${label} feeling`}>
        {PAIN_LABELS.map((lbl, lvl) => (
          <Button
            key={lbl}
            size="sm"
            variant={value === lvl ? "solid" : "bordered"}
            color={value === lvl ? (lvl >= 3 ? "danger" : lvl === 2 ? "warning" : "primary") : "default"}
            onPress={() => onChange(lvl as PainLevel)}
            className="min-w-0 px-2.5"
          >
            {lbl}
          </Button>
        ))}
      </div>
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
