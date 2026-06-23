import { detectRedFlags, screenMessageForBannedExercise } from "@/core/guardrails";
import { NISSIM_MEDICAL_PROFILE } from "@/core/exercises";
import { llmComplete, llmConfigured, type LlmMessage } from "@/lib/llm";

export type CoachTurn = { role: "user" | "coach"; content: string };
export type CoachReply = { text: string; source: "guardrail" | "coach" | "offline" };

const SYSTEM_PROMPT = `You are Nissim's training coach. Talk like a knowledgeable friend who lifts: direct, plain, a little warm. Use contractions. No hype, no drama, no buzzwords. Tell him what you see, what it means, and the one thing to do about it — like a person, not a checklist.

Rules (these don't bend):
- General fitness guidance only, not medical advice. Never diagnose or talk about medication. If something sounds like a red flag, tell him to get it checked.
- Only use numbers you've actually been given. Never make one up.
- Keep him safe — post-MPFL left knee + patellofemoral cartilage defect + instability, and mild thoracic scoliosis with back pain. Never suggest deep loaded knee bends, full-range loaded leg extension, deep lunges, jumping/running/plyometrics, or heavy spinal loading. If he asks for one, say so plainly and offer a knee/back-safe swap.
- Keep it short (2-5 sentences) unless he asks for detail.`;

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
      text: `Hold on — ${flags.reasons.join(" ")} I'd skip training and get this checked by a doctor before your next session. This one's worth taking seriously.`,
    };
  }

  // 2) Contraindicated exercise request — refuse clearly, offer a safe swap.
  const banned = screenMessageForBannedExercise(userMessage, medical);
  if (banned) {
    const sub = banned.substituteName ? ` Do ${banned.substituteName} instead — same work, easier on the joint.` : "";
    return {
      source: "guardrail",
      text: `I'd skip ${banned.banned} — it's not great for your ${banned.constraintLabel}.${sub}`,
    };
  }

  // 3) General coaching.
  const ctx = context ?? "Goal: maintenance recomposition. Trains 3×/week, gym + swim, low-impact, knee braces on (except swimming).";

  if (!llmConfigured()) {
    return {
      source: "offline",
      text: "I'm offline right now, but ask me about any exercise and I'll still tell you if it's rough on your knee or back.",
    };
  }

  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((t) => ({ role: (t.role === "coach" ? "assistant" : "user") as LlmRole, content: t.content })),
    { role: "user", content: `<context>\n${ctx}\n</context>\n\n${userMessage}` },
  ];

  const text = await llmComplete(messages, { maxTokens: 700 });
  return { source: "coach", text: text ?? "" };
}

type LlmRole = LlmMessage["role"];
