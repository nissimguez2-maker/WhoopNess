import Anthropic from "@anthropic-ai/sdk";
import { detectRedFlags, screenMessageForBannedExercise } from "@/core/guardrails";
import { NISSIM_MEDICAL_PROFILE } from "@/core/exercises";
import { buildTodayCard } from "@/lib/mock";

export type CoachTurn = { role: "user" | "coach"; content: string };
export type CoachReply = { text: string; source: "guardrail" | "coach" | "offline" };

const SYSTEM_PROMPT = `You are the WhoopNess coach. Voice: calm, clinical, precise — never hype, never alarmed; same measured tone on good and bad days. Pattern: observation → meaning → smallest safe step.

Rules:
- General fitness guidance only — not medical advice. Never diagnose or advise on medication; defer red flags to a clinician.
- Quote only metrics you are given; never invent numbers.
- Respect the medical guardrails (post-MPFL left knee + patellofemoral cartilage defect + instability; mild thoracic scoliosis with back pain): never suggest deep loaded knee flexion, loaded full-ROM leg extension, deep lunges, jumping/running/plyometrics, or heavy axial spinal loading. If asked for one, refuse plainly and offer a knee/back-safe substitute.
- Keep replies short (2–5 sentences) unless asked for detail.`;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? new Anthropic({ apiKey }) : null;
}

const MODEL = process.env.ANTHROPIC_MODEL_DAILY ?? "claude-sonnet-4-6";

/**
 * Produce the coach's reply. SAFETY IN CODE, FIRST:
 *  1) red-flag symptoms → fixed "pause & see a clinician" (LLM never coaches through it);
 *  2) a request for a contraindicated movement → deterministic refusal + safe substitute;
 *  3) otherwise → Claude (calm/clinical, grounded) if a key is set, else a helpful offline reply.
 */
export async function coachReply(history: CoachTurn[], userMessage: string): Promise<CoachReply> {
  const medical = NISSIM_MEDICAL_PROFILE;

  // 1) Red flags — deterministic, non-negotiable.
  const flags = detectRedFlags({ message: userMessage });
  if (flags.escalate) {
    return {
      source: "guardrail",
      text: `That's worth pausing for — ${flags.reasons.join(" ")} I'd stop training and check in with a clinician before your next session. This is a signal to take seriously, not something to push through.`,
    };
  }

  // 2) Contraindicated exercise request — refuse clearly, offer a safe swap.
  const banned = screenMessageForBannedExercise(userMessage, medical);
  if (banned) {
    const sub = banned.substituteName ? ` Try ${banned.substituteName} instead — same training effect, kinder to the joint.` : "";
    return {
      source: "guardrail",
      text: `I'd skip ${banned.banned} — it's flagged by ${banned.constraintLabel}.${sub}`,
    };
  }

  // 3) General coaching.
  const card = buildTodayCard();
  const context = `Today: recovery ${card.recoveryScore}% (${card.band}), verdict ${card.verdictWord}, session "${card.focus}" (${card.durationMin} min). Goal: maintenance recomposition. Trains 3×/week, gym, low-impact, knee braces on.`;

  const client = getClient();
  if (!client) {
    return {
      source: "offline",
      text: "Coach is offline until an Anthropic API key is set. What I can still tell you from today's card: " +
        `recovery is ${card.recoveryScore}% (${card.verdictWord}); the plan is "${card.focus}" for ~${card.durationMin} min. Ask me about an exercise and I'll check it against your knee/back guardrails.`,
    };
  }

  const msgs: Anthropic.MessageParam[] = [
    ...history.map((t) => ({ role: (t.role === "coach" ? "assistant" : "user") as "assistant" | "user", content: t.content })),
    { role: "user", content: `<context>\n${context}\n</context>\n\n${userMessage}` },
  ];

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: msgs,
  });
  const block = res.content.find((b) => b.type === "text");
  return { source: "coach", text: block && block.type === "text" ? block.text.trim() : "" };
}
