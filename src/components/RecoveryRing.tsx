import { CircularProgress } from "@heroui/react";
import type { RecoveryBand } from "@/core/types";

const BAND_COLOR: Record<RecoveryBand, "success" | "warning" | "danger"> = {
  green: "success",
  amber: "warning",
  red: "danger",
};

const BAND_TEXT: Record<RecoveryBand, string> = {
  green: "text-success-400",
  amber: "text-warning-400",
  red: "text-danger-400",
};

/** Recovery ring: number is always written (never ring-only), color carries the band. */
export function RecoveryRing({ score, band }: { score: number; band: RecoveryBand }) {
  return (
    <CircularProgress
      aria-label={`Recovery ${score} percent`}
      value={score}
      color={BAND_COLOR[band]}
      classNames={{
        svg: "w-24 h-24",
        track: "stroke-default-100",
        value: `text-2xl font-bold font-mono ${BAND_TEXT[band]}`,
      }}
      showValueLabel
      valueLabel={
        <div className="flex flex-col items-center leading-none">
          <span className={`font-mono text-2xl font-bold ${BAND_TEXT[band]}`}>{score}</span>
          <span className="text-[11px] text-foreground-500">%</span>
        </div>
      }
    />
  );
}
