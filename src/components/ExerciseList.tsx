"use client";

import { Accordion, AccordionItem, Chip } from "@heroui/react";
import { ChevronDown, Dumbbell, PersonStanding, Bike, Waves, Footprints, Activity } from "lucide-react";
import type { ExerciseView } from "@/core/types";

function ExIcon({ ex }: { ex: ExerciseView }) {
  const cls = "text-foreground-500 shrink-0";
  if (ex.id === "swim_easy") return <Waves size={16} className={cls} aria-hidden />;
  if (ex.id === "walking") return <Footprints size={16} className={cls} aria-hidden />;
  if (ex.id === "stationary_bike") return <Bike size={16} className={cls} aria-hidden />;
  if (ex.equipment === "cardio") return <Activity size={16} className={cls} aria-hidden />;
  if (ex.equipment === "bodyweight") return <PersonStanding size={16} className={cls} aria-hidden />;
  return <Dumbbell size={16} className={cls} aria-hidden />;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-medium bg-content2 px-2.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-foreground-500">{label}</dt>
      <dd className="font-mono text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function ExerciseList({ exercises }: { exercises: ExerciseView[] }) {
  if (exercises.length === 0) {
    return <p className="px-1 text-sm text-foreground-500">Rest &amp; recover today — no exercises prescribed.</p>;
  }
  return (
    <Accordion variant="light" selectionMode="multiple" showDivider className="px-0" itemClasses={{ trigger: "py-3", content: "pb-3 pt-0" }}>
      {exercises.map((ex, i) => (
        <AccordionItem
          key={`${ex.id}-${i}`}
          aria-label={ex.name}
          startContent={<ExIcon ex={ex} />}
          title={<span className="text-sm font-medium text-foreground">{ex.name}</span>}
          subtitle={<span className="font-mono text-xs text-foreground-500">{ex.quick}</span>}
          indicator={({ isOpen }) => (
            <ChevronDown size={16} className={`text-foreground-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          )}
        >
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-3 gap-2">
              {ex.isDuration ? (
                <>
                  <Stat label="Time" value={`${ex.durationMin ?? 20} min`} />
                  {ex.reps && <Stat label="Effort" value={ex.reps} />}
                </>
              ) : (
                <>
                  {ex.sets != null && <Stat label="Sets" value={ex.sets} />}
                  {ex.reps && <Stat label="Reps" value={ex.reps} />}
                  <Stat label="Load" value={ex.loadKg ? `${ex.loadKg} kg` : "Bodyweight"} />
                  {ex.restSec != null && <Stat label="Rest" value={`${ex.restSec}s`} />}
                  {ex.rpe != null && <Stat label="RPE" value={ex.rpe} />}
                </>
              )}
            </dl>
            {ex.instructions && <p className="text-sm leading-relaxed text-foreground-600">{ex.instructions}</p>}
            {ex.cues && ex.cues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ex.cues.map((c) => (
                  <Chip key={c} size="sm" variant="flat" className="text-foreground-600">
                    {c}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
