"use client";

import { useState } from "react";
import { CardBody, Select, SelectItem, Input, Button } from "@heroui/react";
import { Dumbbell, Waves, Check } from "lucide-react";
import type { ScheduleSlot } from "@/core/schedule";
import { DAYS } from "@/core/schedule";
import { SurfaceCard } from "./ui/SurfaceCard";
import { PageHeader } from "./ui/PageHeader";
import { updateScheduleSlot } from "@/app/week/actions";

export function WeeklyPlanView({ slots: initial }: { slots: ScheduleSlot[] }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>(initial);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function save(i: number, patch: Partial<ScheduleSlot>) {
    const cur = slots[i]!;
    // Only persist a real change (ignore hydration/programmatic events).
    const changed =
      (patch.day != null && patch.day !== cur.day) ||
      (patch.time != null && patch.time !== cur.time) ||
      (patch.type != null && patch.type !== cur.type);
    if (!changed) return;
    const next = slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setSlots(next);
    const s = next[i]!;
    if (!s.id) return;
    const res = await updateScheduleSlot({ id: s.id, day: s.day, time: s.time, type: s.type });
    if (res.ok) {
      setSavedId(s.id);
      setTimeout(() => setSavedId((cur2) => (cur2 === s.id ? null : cur2)), 1500);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Week" subtitle="1 swim, 2 gym. Set your days and times." />

      <p className="px-1 text-xs text-foreground-500">
        Exercises aren&apos;t set here. I build each session on the day from your recovery and recent training.
      </p>

      {slots.map((s, i) => (
        <SurfaceCard key={s.id ?? i}>
          <CardBody className="gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                {s.type === "swim" ? <Waves size={16} className="text-primary-400" /> : <Dumbbell size={16} className="text-foreground-500" />}
                {s.type === "swim" ? "Swim" : "Gym"}
              </span>
              {savedId === s.id && (
                <span className="flex items-center gap-1 text-xs text-success-400">
                  <Check size={13} /> saved
                </span>
              )}
            </div>

            <div className="flex gap-2" role="group" aria-label="Type">
              <Button
                fullWidth
                size="sm"
                variant={s.type === "gym" ? "solid" : "bordered"}
                color={s.type === "gym" ? "primary" : "default"}
                startContent={<Dumbbell size={14} />}
                onPress={() => save(i, { type: "gym" })}
              >
                Gym
              </Button>
              <Button
                fullWidth
                size="sm"
                variant={s.type === "swim" ? "solid" : "bordered"}
                color={s.type === "swim" ? "primary" : "default"}
                startContent={<Waves size={14} />}
                onPress={() => save(i, { type: "swim" })}
              >
                Swim
              </Button>
            </div>

            <div className="flex gap-2">
              <Select
                label="Day"
                size="sm"
                className="flex-1"
                selectedKeys={[s.day]}
                onSelectionChange={(keys) => save(i, { day: String(Array.from(keys)[0] ?? s.day) })}
              >
                {DAYS.map((d) => (
                  <SelectItem key={d}>{d}</SelectItem>
                ))}
              </Select>
              <Input label="Time" size="sm" type="time" className="flex-1" value={s.time} onValueChange={(v) => save(i, { time: v })} />
            </div>
          </CardBody>
        </SurfaceCard>
      ))}

      <p className="text-center text-xs text-foreground-500">
        Open <span className="text-primary-400">Today</span> on a training day and tap Build to get your session.
      </p>
    </div>
  );
}
