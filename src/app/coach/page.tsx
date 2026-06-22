import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function CoachPage() {
  return (
    <PagePlaceholder title="Coach" subtitle="Calm, clinical — ask anything, or adjust the plan">
      <p>
        A calm/clinical coach that explains the &quot;why&quot;, answers questions, and can change your
        plan in plain language — always through the safety guardrails (it will refuse a
        contraindicated movement and offer a safe substitute, and defer to a clinician on red flags).
      </p>
      <p className="text-foreground-500">Chat — coming in the next build phase.</p>
    </PagePlaceholder>
  );
}
