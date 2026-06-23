import { Chip } from "@heroui/react";
import { Watch, CircleAlert } from "lucide-react";

/**
 * The keystone in-app status. With no push notifications, wearing the WHOOP at
 * night is the one habit the whole app depends on — so we surface it on every open.
 */
export function KeystoneStatus({
  wornLastNight,
  nightsWorn,
  ofNights,
}: {
  wornLastNight: boolean;
  nightsWorn?: number;
  ofNights?: number;
}) {
  return (
    <div className="ws-surface-highlight flex items-center justify-between rounded-xl border border-white/[0.06] bg-content1 px-4 py-3">
      <div className="flex items-center gap-2">
        {wornLastNight ? (
          <Watch size={16} className="text-success-400" aria-hidden />
        ) : (
          <CircleAlert size={16} className="text-warning-400" aria-hidden />
        )}
        <span className="text-sm text-foreground-600">
          {wornLastNight ? "WHOOP worn last night" : "No recovery yet — was the WHOOP on?"}
        </span>
      </div>
      {nightsWorn != null && ofNights != null && (
        <Chip size="sm" variant="flat" className="font-mono">
          {nightsWorn}/{ofNights} nights
        </Chip>
      )}
    </div>
  );
}
