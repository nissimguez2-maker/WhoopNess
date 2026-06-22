"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const TEAL = "#3FB6C6";
const VIOLET = "#8B7CF6";
const GRID = "rgba(255,255,255,0.08)";
const TICK = "#8A93A1";

const tooltipStyle = {
  background: "#12151C",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  color: "#ECEFF4",
};

function ChartCard({ title, soWhat, children }: { title: string; soWhat: string; children: React.ReactNode }) {
  return (
    <Card className="ws-surface-highlight border border-white/10 bg-content1" shadow="sm">
      <CardHeader className="flex-col items-start pb-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-[11px] text-foreground-500">{soWhat}</p>
      </CardHeader>
      <CardBody className="pt-2">{children}</CardBody>
    </Card>
  );
}

export interface TrendsData {
  e1rm: Array<{ week: string; chestPress: number; legPress: number }>;
  volume: Array<{ week: string; sets: number }>;
  weight: Array<{ week: string; kg: number }>;
  radar: Array<{ muscle: string; actual: number; target: number }>;
}

export function TrendsCharts({ data }: { data: TrendsData }) {
  return (
    <div className="flex flex-col gap-4">
      <ChartCard title="Strength (estimated 1RM)" soWhat="Your #1 metric — climbing even while weight stays flat.">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={data.e1rm} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: TICK }} />
            <Line type="monotone" dataKey="chestPress" name="Chest press" stroke={TEAL} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="legPress" name="Leg press" stroke={VIOLET} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Weekly volume" soWhat="The input that earns the strength — trending up.">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data.volume} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="sets" name="Hard sets" fill={TEAL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Balance (volume by muscle)" soWhat="Actual vs target share — fill the gaps for a harmonious build.">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={data.radar} outerRadius={80}>
            <PolarGrid stroke={GRID} />
            <PolarAngleAxis dataKey="muscle" tick={{ fill: TICK, fontSize: 10 }} />
            <Radar name="Target" dataKey="target" stroke={TICK} fill={TICK} fillOpacity={0.08} />
            <Radar name="You" dataKey="actual" stroke={TEAL} fill={TEAL} fillOpacity={0.3} />
            <Legend wrapperStyle={{ fontSize: 11, color: TICK }} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Bodyweight, in context" soWhat="Flat/down weight + rising volume = recomposition working.">
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data.weight} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="kg" name="Weight (kg)" stroke={TICK} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
