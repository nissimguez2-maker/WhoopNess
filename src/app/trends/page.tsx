import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function TrendsPage() {
  return (
    <PagePlaceholder title="Trends" subtitle="Strength first — the scale in context">
      <p>
        Leads with <b>strength PRs (e1RM)</b> and <b>weekly volume per muscle group</b>, then
        recovery / HRV-baseline / sleep, and finally your <b>bodyweight in context</b> (a flat scale
        next to rising volume = recomposition working).
      </p>
      <p>
        The <b>harmony body-map</b> shows muscle balance — the goal is a uniform, calm fill, not a
        maxed-out heatmap. Early on you&apos;ll see honest &quot;collecting baseline&quot; states until there&apos;s
        enough data to trust a trend.
      </p>
      <p className="text-foreground-500">Recharts visualizations — coming in the next build phase.</p>
    </PagePlaceholder>
  );
}
