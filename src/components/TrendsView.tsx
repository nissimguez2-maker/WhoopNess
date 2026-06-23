"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardBody, CardHeader, Input, Button } from "@heroui/react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Dumbbell, HeartPulse, Scale } from "lucide-react";
import { SurfaceCard } from "./ui/SurfaceCard";
import { PageHeader } from "./ui/PageHeader";
import { EmptyState } from "./ui/EmptyState";
import { logWeighIn } from "@/app/trends/actions";

const LINE = "#306D29";
const GRID = "rgba(20,56,15,0.10)";
const TICK = "#355E2C";
const tooltipStyle = { background: "#FBF5DD", border: "1px solid rgba(20,56,15,0.18)", borderRadius: 12, fontSize: 12, color: "#14380F" };

const shortDate = (d: string) => {
  const parts = d.split("-");
  return parts.length === 3 ? `${+parts[2]!}/${+parts[1]!}` : d;
};

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

function TrendLine({ data, dataKey, domain, unit }: { data: Array<Record<string, unknown>>; dataKey: string; domain?: [number | string, number | string]; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: TICK, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis domain={domain ?? ["auto", "auto"]} tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}${unit ?? ""}`, ""]} labelFormatter={(l) => shortDate(String(l))} />
        <Line type="monotone" dataKey={dataKey} stroke={LINE} strokeWidth={2} dot={{ r: 2, fill: LINE }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TrendsView({
  recovery,
  strength,
  bodyweight,
  currentBodyweight,
}: {
  recovery: Array<{ date: string; score: number }>;
  strength: Array<{ date: string; e1rm: number }>;
  bodyweight: Array<{ date: string; kg: number }>;
  currentBodyweight?: number;
}) {
  const router = useRouter();
  const [kg, setKg] = useState(currentBodyweight != null ? String(currentBodyweight) : "");
  const [saving, setSaving] = useState(false);

  async function saveWeighIn() {
    const v = Number(kg);
    if (!Number.isFinite(v)) return;
    setSaving(true);
    const res = await logWeighIn(v);
    setSaving(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Trends" subtitle="Your strength, recovery and weight over time" />

      <ChartCard title="Strength (estimated 1RM)" soWhat="Your best estimated 1RM each gym session.">
        {strength.length >= 2 ? (
          <TrendLine data={strength} dataKey="e1rm" unit="kg" />
        ) : (
          <EmptyState className="h-[180px]" icon={<Dumbbell size={26} />} title="Nothing here yet" body="Log a couple of gym sessions and your strength trend shows up here." />
        )}
      </ChartCard>

      <ChartCard title="Recovery (WHOOP)" soWhat="When this drops, I ease the plan off.">
        {recovery.length >= 3 ? (
          <TrendLine data={recovery} dataKey="score" domain={[0, 100]} unit="%" />
        ) : (
          <EmptyState className="h-[180px]" icon={<HeartPulse size={26} />} title="Nothing here yet" body="Wear your WHOOP a few nights and your recovery trend shows up here." />
        )}
      </ChartCard>

      <ChartCard title="Bodyweight" soWhat="The recomp line — tap in a weigh-in whenever you check.">
        <div className="mb-3 flex items-end gap-2">
          <Input size="sm" type="number" inputMode="decimal" step="0.1" label="Today's weight (kg)" value={kg} onValueChange={setKg} className="max-w-[180px]" />
          <Button size="sm" color="primary" onPress={saveWeighIn} isLoading={saving} isDisabled={!kg}>
            Save
          </Button>
        </div>
        {bodyweight.length >= 2 ? (
          <TrendLine data={bodyweight} dataKey="kg" unit="kg" />
        ) : (
          <EmptyState className="h-[140px]" icon={<Scale size={26} />} title="One point so far" body="Add a few weigh-ins and the line fills in." />
        )}
      </ChartCard>

      <p className="text-center text-[11px] text-foreground-500">These fill in as you train, weigh in, and wear your WHOOP.</p>
    </div>
  );
}
