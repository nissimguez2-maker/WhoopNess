import { Card, CardBody, CardHeader } from "@heroui/react";
import { HarmonyBodyMap } from "@/components/HarmonyBodyMap";
import { TrendsCharts, type TrendsData } from "@/components/TrendsCharts";
import { getHarmony } from "@/lib/mockTrends";
import { E1RM_SERIES, VOLUME_SERIES, WEIGHT_SERIES } from "@/lib/mockTrends";
import { DEFAULT_TARGET_SHARES } from "@/core/metrics";
import type { MuscleGroup } from "@/core/types";

const SHORT: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings_glutes: "Hams",
  calves: "Calves",
  core: "Core",
};

export default function TrendsPage() {
  const harmony = getHarmony(); // flows through the real harmonyScore/volume core

  const radar: TrendsData["radar"] = (Object.keys(SHORT) as MuscleGroup[]).map((g) => ({
    muscle: SHORT[g],
    actual: Math.round(harmony.shares[g] * 100),
    target: Math.round(DEFAULT_TARGET_SHARES[g] * 100),
  }));

  const data: TrendsData = { e1rm: E1RM_SERIES, volume: VOLUME_SERIES, weight: WEIGHT_SERIES, radar };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Trends</h1>
        <p className="text-xs text-foreground-500">Strength first — the scale in context</p>
      </header>

      <Card className="ws-surface-highlight border border-white/10 bg-content1" shadow="sm">
        <CardHeader className="flex-col items-start pb-0">
          <h2 className="text-sm font-semibold">Harmony</h2>
          <p className="text-[11px] text-foreground-500">Muscle balance from training volume</p>
        </CardHeader>
        <CardBody>
          <HarmonyBodyMap
            shares={harmony.shares}
            targets={DEFAULT_TARGET_SHARES}
            score={harmony.score}
            lagging={harmony.lagging}
          />
        </CardBody>
      </Card>

      <TrendsCharts data={data} />

      <p className="text-center text-[11px] text-foreground-500">
        Demo data. Live charts begin once your WHOOP + training logs are flowing — early on you&apos;ll
        see honest &quot;collecting baseline&quot; states until there&apos;s enough to trust a trend.
      </p>
    </div>
  );
}
