"use client";

import { CardBody, CardHeader } from "@heroui/react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Dumbbell, BarChart3, PersonStanding, HeartPulse } from "lucide-react";
import { SurfaceCard } from "./ui/SurfaceCard";
import { PageHeader } from "./ui/PageHeader";
import { EmptyState } from "./ui/EmptyState";

const TEAL = "#3FB6C6";
const GRID = "rgba(255,255,255,0.08)";
const TICK = "#8A93A1";
const tooltipStyle = { background: "#12151C", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12, color: "#ECEFF4" };

function ChartCard({ title, soWhat, children }: { title: string; soWhat: string; children: React.ReactNode }) {
  return (
    <SurfaceCard>
      <CardHeader className="flex-col items-start pb-0">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-[11px] text-foreground-500">{soWhat}</p>
      </CardHeader>
      <CardBody className="pt-2">{children}</CardBody>
    </SurfaceCard>
  );
}

export function TrendsView({ recovery }: { recovery: Array<{ date: string; score: number }> }) {
  const recoveryData = recovery.map((r, i) => ({ i, score: r.score }));
  const hasRecovery = recoveryData.length >= 3;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Trends" subtitle="Strength first — the scale in context" />

      <ChartCard title="Strength (estimated 1RM)" soWhat="Your #1 metric — appears once you log a few sessions.">
        <EmptyState
          className="h-[180px]"
          icon={<Dumbbell size={26} />}
          title="Collecting baseline"
          body="Log a few gym sessions and your estimated 1RM trend will appear here."
        />
      </ChartCard>

      <ChartCard title="Weekly volume" soWhat="Hard sets per muscle — the input that earns the strength.">
        <EmptyState
          className="h-[160px]"
          icon={<BarChart3 size={26} />}
          title="No sets logged yet"
          body="Your weekly hard-set count builds this chart as you train."
        />
      </ChartCard>

      <ChartCard title="Recovery (WHOOP)" soWhat="Your readiness trend — the brake the plan respects.">
        {hasRecovery ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={recoveryData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="i" hide />
              <YAxis domain={[0, 100]} tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Recovery"]} labelFormatter={() => ""} />
              <Line type="monotone" dataKey="score" stroke={TEAL} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            className="h-[180px]"
            icon={<HeartPulse size={26} />}
            title="Collecting baseline"
            body="Wear your WHOOP a few nights and your recovery trend will appear here."
          />
        )}
      </ChartCard>

      <ChartCard title="Harmony" soWhat="Muscle balance from training volume — the goal is even, calm teal.">
        <EmptyState
          className="h-[180px]"
          icon={<PersonStanding size={26} />}
          title="Not measured yet"
          body="Log this week's sets to see your balance light up."
        />
      </ChartCard>

      <p className="text-center text-[11px] text-foreground-500">
        Charts fill in as your WHOOP data and training logs accumulate — no demo data.
      </p>
    </div>
  );
}
