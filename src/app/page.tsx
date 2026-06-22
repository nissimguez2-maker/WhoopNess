import { DailyCard } from "@/components/DailyCard";
import { KeystoneStatus } from "@/components/KeystoneStatus";
import { buildTodayCard } from "@/lib/mock";

export default function TodayPage() {
  // Server-side: assemble the card through the real core logic (mock inputs for now).
  const card = buildTodayCard();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Whoop<span className="text-primary-400">Ness</span>
          </h1>
          <p className="text-xs text-foreground-500">{today}</p>
        </div>
      </header>

      <KeystoneStatus wornLastNight nightsWorn={5} ofNights={7} />
      <DailyCard data={card} />
    </div>
  );
}
