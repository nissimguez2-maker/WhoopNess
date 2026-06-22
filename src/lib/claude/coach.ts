import { llmComplete, type LlmMessage } from "@/lib/llm";
import type { TodayCard } from "@/lib/mock";

/**
 * Daily-card narration. "LLM proposes, rules dispose": the verdict, branch, and fueling
 * are ALREADY decided by the core rules engine — the model only narrates them in a
 * calm/clinical voice, citing the real numbers it's given. Provider: OpenRouter.
 *
 * (Folder name is historical; the runtime provider is OpenRouter, not Anthropic.)
 */
const SYSTEM_PROMPT = `You are the WhoopNess coach. Voice: calm, clinical, precise — never hype, never alarmed. Always: observation → meaning → smallest safe step.

Hard rules:
- Quote ONLY the metrics provided; never estimate or invent a number.
- The verdict, session branch, and fueling targets are ALREADY DECIDED by the app's rules. Narrate and explain them; do not change them.
- General fitness guidance, not medical advice. Respect the medical guardrails (post-MPFL knee + patellofemoral cartilage defect; mild scoliosis): never suggest deep loaded knee flexion, loaded full-ROM leg extension, jumping/running, or heavy axial loading.`;

/** Generate the short calm "why" narration for an already-decided daily card. */
export async function narrateDailyCard(card: TodayCard): Promise<string> {
  const facts = [
    `Recovery: ${card.recoveryScore}% (band ${card.band}).`,
    `Verdict: ${card.verdictWord}.`,
    `Session: ${card.focus}, ${card.durationMin} min.`,
    `Fuel: ${card.fuel.calories} kcal, ${card.fuel.proteinG} g protein, pre-lift carbs ${card.fuel.preCarbG} g.`,
    `Reasoning inputs: ${card.why.join(" ")}`,
  ].join("\n");

  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `<facts>\n${facts}\n</facts>\n\nWrite 2–3 calm sentences explaining today's recommendation to the athlete, citing only the facts above.`,
    },
  ];

  const text = await llmComplete(messages, { maxTokens: 300 });
  return text ?? "";
}
