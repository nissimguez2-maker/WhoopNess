"use server";

import { coachReply, type CoachTurn, type CoachReply } from "@/lib/claude/chat";

/** Server action: all coaching (and the safety guardrails) runs server-side. */
export async function askCoach(history: CoachTurn[], message: string): Promise<CoachReply> {
  const clean = message.trim().slice(0, 2000);
  if (!clean) return { source: "offline", text: "Ask me anything about today's training, recovery, or fueling." };
  try {
    return await coachReply(history.slice(-10), clean);
  } catch {
    return { source: "offline", text: "Something went wrong reaching the coach. Try again in a moment." };
  }
}
