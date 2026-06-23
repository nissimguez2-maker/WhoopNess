import { detectRedFlags, screenMessageForBannedExercise } from "@/core/guardrails";
import { NISSIM_MEDICAL_PROFILE } from "@/core/exercises";
import { llmComplete, llmConfigured, type LlmMessage } from "@/lib/llm";

export type CoachTurn = { role: "user" | "coach"; content: string };
export type CoachReply = { text: string; source: "guardrail" | "coach" | "offline" };

const SYSTEM_PROMPT = `You are the WhoopNess coach. Voice: calm, clinical, precise — never hype, never alarmed; same measured tone on good and bad days. Pattern: observation → meaning → smallest safe step.

Rules:
- General fitness guidance only — not medical advice. Never diagnose or advise on medication; defer red flags to a clinician.
- Quote only metrics you are given; never invent numbers.
- Respect the medical guardrails (post-MPFL left knee + patellofemoral cartilage defect + instability; mild thoracic scoliosis with back pain): never suggest deep loaded knee flexion, loaded full-ROM leg extension, deep lunges, jumping/running/plyometrics, or heavy axial spinal loading. If asked for one, refuse plainly and offer a knee/back-safe substitute.
- Keep replies short (2–5 sentences) unless asked for detail.`;

/**
 * Produce the coach's reply. SAFETY IN CODE, FIRST:
 *  1) red-flag symptoms → fixed "pause & see a clinician" (the model never coaches through it);
 *  2) a request for a contraindicated movement → deterministic refusal + safe substitute;
 *  3) otherwise → the LLM (OpenRouter, calm/clinical, grounded) if configured, else an offline reply.
 */
export async function coachReply(history: CoachTurn[], userMessage: string, context?: string): Promise<CoachReply> {
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
  const ctx = context ?? "Goal: maintenance recomposition. Trains 3×/week, gym + swim, low-impact, knee braces on (except swimming).";

  if (!llmConfigured()) {
    return {
      source: "offline",
      text: "Coach is offline until the OpenRouter key is set. Ask me about an exercise and I'll still check it against your knee/back guardrails.",
    };
  }

  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((t) => ({ role: (t.role === "coach" ? "assistant" : "user") as LlmRole, content: t.content })),
    { role: "user", content: `<context>\n${ctx}\n</context>\n\n${userMessage}` },
  ];

  const text = await llmComplete(messages, { maxTokens: 400 });
  return { source: "coach", text: text ?? "" };
}

type LlmRole = LlmMessage["role"];
