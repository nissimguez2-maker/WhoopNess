import type { MuscleGroup } from "@/core/types";

/**
 * Harmony body-map. Single-hue teal luminance scale keyed to volume-share vs target:
 * under-trained → dim, balanced → calm mid-teal (the goal), over-emphasized → bright.
 * The target physique reads as a uniform, calm teal — not a maxed-out heatmap.
 * (Recovery green/amber/red are deliberately NOT used here.)
 */

const DIM = "#1E5560";
const VERY_DIM = "#143A43";
const CALM = "#3FB6C6";
const BRIGHT = "#9EE3EC";

function fillForRatio(ratio: number): string {
  if (ratio < 0.55) return VERY_DIM;
  if (ratio < 0.85) return DIM;
  if (ratio <= 1.25) return CALM;
  return BRIGHT;
}

export function HarmonyBodyMap({
  shares,
  targets,
  score,
  lagging,
}: {
  shares: Record<MuscleGroup, number>;
  targets: Record<MuscleGroup, number>;
  score: number;
  lagging?: MuscleGroup;
}) {
  const ratio = (g: MuscleGroup) => (targets[g] > 0 ? shares[g] / targets[g] : 1);
  const armsRatio =
    (shares.biceps + shares.triceps) / Math.max(1e-9, targets.biceps + targets.triceps);

  const fill = {
    shoulders: fillForRatio(ratio("shoulders")),
    chest: fillForRatio(ratio("chest")),
    arms: fillForRatio(armsRatio),
    core: fillForRatio(ratio("core")),
    quads: fillForRatio(ratio("quads")),
    calves: fillForRatio(ratio("calves")),
  };
  const stroke = "rgba(255,255,255,0.10)";

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 220 380" className="h-72 w-auto" role="img" aria-label={`Harmony balance ${score} of 100`}>
        {/* head + neck */}
        <circle cx="110" cy="30" r="17" fill={VERY_DIM} stroke={stroke} />
        <rect x="102" y="46" width="16" height="12" rx="4" fill={VERY_DIM} stroke={stroke} />
        {/* shoulders */}
        <ellipse cx="80" cy="70" rx="16" ry="11" fill={fill.shoulders} stroke={stroke} />
        <ellipse cx="140" cy="70" rx="16" ry="11" fill={fill.shoulders} stroke={stroke} />
        {/* chest */}
        <rect x="84" y="64" width="52" height="40" rx="12" fill={fill.chest} stroke={stroke} />
        {/* arms */}
        <rect x="58" y="72" width="17" height="64" rx="8" fill={fill.arms} stroke={stroke} />
        <rect x="145" y="72" width="17" height="64" rx="8" fill={fill.arms} stroke={stroke} />
        {/* core */}
        <rect x="90" y="108" width="40" height="52" rx="10" fill={fill.core} stroke={stroke} />
        {/* pelvis */}
        <rect x="88" y="162" width="44" height="16" rx="6" fill={VERY_DIM} stroke={stroke} />
        {/* quads */}
        <rect x="86" y="182" width="20" height="78" rx="9" fill={fill.quads} stroke={stroke} />
        <rect x="114" y="182" width="20" height="78" rx="9" fill={fill.quads} stroke={stroke} />
        {/* calves */}
        <rect x="88" y="266" width="17" height="70" rx="8" fill={fill.calves} stroke={stroke} />
        <rect x="115" y="266" width="17" height="70" rx="8" fill={fill.calves} stroke={stroke} />
      </svg>

      <div className="flex items-center gap-4 text-center">
        <div>
          <p className="font-mono text-3xl font-bold text-primary-400">{score}</p>
          <p className="text-[11px] uppercase tracking-wider text-foreground-500">Balance</p>
        </div>
        {lagging && (
          <div className="text-left text-xs text-foreground-600">
            <span className="text-foreground-500">Lagging: </span>
            <span className="font-medium text-foreground">{lagging.replace("_", " / ")}</span>
            <p className="text-foreground-500">add a set or two next week</p>
          </div>
        )}
      </div>

      {/* legend */}
      <div className="flex items-center gap-3 text-[11px] text-foreground-500">
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: DIM }} /> under</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: CALM }} /> balanced</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: BRIGHT }} /> over</span>
      </div>
      <p className="max-w-xs text-center text-[11px] text-foreground-500">
        Reflects what you <i>train</i> (volume balance), not yet what your physique looks like. Goal: an even, calm teal.
      </p>
    </div>
  );
}
