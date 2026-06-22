"use client";

import { Card, CardBody, CardHeader, Chip, Tabs, Tab } from "@heroui/react";
import { Clock } from "lucide-react";

export interface BranchView {
  band: "green" | "amber" | "red";
  label: string;
  durationMin: number;
  exercises: Array<{ name: string; detail: string }>;
}
export interface SessionView {
  day: string;
  time?: string;
  focus: string;
  branches: BranchView[];
}

// Literal class strings (Tailwind can't see dynamically-built class names).
const BAND_DOT: Record<BranchView["band"], string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
};

export function WeeklyPlanView({ sessions, weekLabel }: { sessions: SessionView[]; weekLabel: string }) {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Week</h1>
        <p className="text-xs text-foreground-500">{weekLabel} · 3 sessions · knee/back-safe</p>
      </header>

      {sessions.map((s) => (
        <Card key={s.day} className="ws-surface-highlight border border-white/10 bg-content1" shadow="sm">
          <CardHeader className="flex items-center justify-between pb-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{s.day}</span>
              {s.time && (
                <Chip size="sm" variant="flat" className="font-mono">
                  {s.time}
                </Chip>
              )}
              <span className="text-foreground-600">· {s.focus}</span>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <Tabs aria-label={`${s.day} branches`} size="sm" variant="solid" radius="md" color="primary">
              {s.branches
                .filter((b) => b.exercises.length > 0)
                .map((b) => (
                  <Tab
                    key={b.band}
                    title={
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${BAND_DOT[b.band]}`} aria-hidden />
                        <span>{b.label}</span>
                      </div>
                    }
                  >
                    <div className="mb-2 flex items-center gap-1 text-xs text-foreground-500">
                      <Clock size={12} /> <span className="font-mono">{b.durationMin} min</span>
                    </div>
                    <ul className="space-y-2">
                      {b.exercises.map((e, i) => (
                        <li key={i} className="flex items-center justify-between border-b border-divider pb-2 last:border-0">
                          <span className="text-sm text-foreground">{e.name}</span>
                          <span className="font-mono text-xs text-foreground-500">{e.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </Tab>
                ))}
            </Tabs>
          </CardBody>
        </Card>
      ))}

      <p className="text-center text-xs text-foreground-500">
        Each day&apos;s branch is chosen by your morning recovery — green → primary, amber → lighter, red → recovery.
      </p>
    </div>
  );
}
