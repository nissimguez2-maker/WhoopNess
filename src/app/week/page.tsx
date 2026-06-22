import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function WeekPage() {
  return (
    <PagePlaceholder title="Week" subtitle="Saturday planning — your slots → a recommended week">
      <p>
        Each Saturday you&apos;ll enter this week&apos;s training slots and the coach generates a
        balanced, knee/back-safe week. Every session carries a <b>primary</b> plus 1–2{" "}
        <b>alternative branches</b> — and those branches are exactly what the daily card picks from
        based on your recovery (green → primary, amber → lighter, red → recovery).
      </p>
      <p className="text-foreground-500">Planner UI — coming in the next build phase.</p>
    </PagePlaceholder>
  );
}
