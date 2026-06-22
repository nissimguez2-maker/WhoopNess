import Anthropic from "@anthropic-ai/sdk";
import type { TodayCard } from "@/lib/mock";

/**
 * The Claude coaching layer. "LLM proposes, rules dispose":
 *  - The daily card's verdict, branch, and fueling are already DECIDED by the core
 *    rules engine. Claude only NARRATES them in a calm/clinical voice, citing the
 *    real numbers it is given — it never invents a recommendation or a metric.
 *  - Weekly plan generation (separate) is constrained to the pre-filtered allowed
 *    exercise set and re-validated server-side by the guardrail engine before display.
 *
 * No PII or secrets are ever placed in the model context (only de-identified,
 * functional data). Untrusted text (PDF extracts, WHOOP strings) is fenced as data.
 */

const SYSTEM_PROMPT = `You are the WhoopNess coach. Voice: calm, clinical, precise — never hype, never alarmed; the same measured tone on a good day and a bad day. Always: observation → meaning → smallest safe step.

Hard rules:
- Quote ONLY the metrics provided to you. Never estimate or invent a number; if a value is absent, say it's unavailable.
- The training verdict, session branch, and fueling targets are ALREADY DECIDED by the app's rules. Narrate and explain them; do not change them.
- This is general fitness guidance, not medical advice. Do not diagnose or advise on medication. Defer red flags to a clinician.
- Respect the medical guardrails (post-MPFL knee + patellofemoral cartilage defect; mild scoliosis): never suggest deep loaded knee flexion, loaded full-ROM leg extension, jumping/running, or heavy axial spinal loading.`;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set.");
  return new Anthropic({ apiKey });
}

const MODEL_DAILY = process.env.ANTHROPIC_MODEL_DAILY ?? "claude-sonnet-4-6";

/**
 * Generate the short, calm "why" narration for an already-decided daily card.
 * Returns plain text. The structured verdict/session/fuel are rendered from the
 * rules output, not from this text.
 */
export async function narrateDailyCard(card: TodayCard): Promise<string> {
  const client = getClient();
  const facts = [
    `Recovery: ${card.recoveryScore}% (band ${card.band}).`,
    `Verdict: ${card.verdictWord}.`,
    `Session: ${card.focus}, ${card.durationMin} min.`,
    `Fuel: ${card.fuel.calories} kcal, ${card.fuel.proteinG} g protein, pre-lift carbs ${card.fuel.preCarbG} g.`,
    `Reasoning inputs: ${card.why.join(" ")}`,
  ].join("\n");

  const msg = await client.messages.create({
    model: MODEL_DAILY,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `<facts>\n${facts}\n</facts>\n\nWrite 2–3 calm sentences explaining today's recommendation to the athlete, citing only the facts above.`,
      },
    ],
  });

  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}
