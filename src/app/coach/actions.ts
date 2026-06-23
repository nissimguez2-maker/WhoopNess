"use server";

import { coachReply, type CoachReply, type CoachTurn } from "@/lib/claude/chat";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { getOwnerRecovery } from "@/lib/whoop/sync";

/** Send a message: persist it, build live context, reply, persist the reply. */
export async function askCoach(message: string): Promise<CoachReply> {
  const clean = message.trim().slice(0, 2000);
  if (!clean) return { source: "offline", text: "What's on your mind — today's session, your knee, food?" };

  try {
    const admin = getSupabaseAdmin();
    const ownerId = getOwnerId();

    await admin.from("chat_messages").insert({ user_id: ownerId, role: "user", content: clean });

    const { data } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(11);
    const chronological = (data ?? []).reverse();
    // Drop the trailing current message — coachReply appends it itself.
    const history: CoachTurn[] = chronological.slice(0, -1).map((m) => ({
      role: m.role === "coach" ? "coach" : "user",
      content: m.content as string,
    }));

    const recovery = await getOwnerRecovery(ownerId);
    const context = recovery
      ? `Today's recovery is ${recovery.recoveryScore}%. Goal: maintenance recomposition; trains 3×/week (gym + swim), low-impact, knee/back guardrails.`
      : undefined;

    const reply = await coachReply(history, clean, context);
    await admin.from("chat_messages").insert({ user_id: ownerId, role: "coach", content: reply.text });
    return reply;
  } catch {
    try {
      return await coachReply([], clean);
    } catch {
      return { source: "offline", text: "Couldn't reach me just now. Give it a second and try again." };
    }
  }
}

export async function clearChatHistory(): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from("chat_messages").delete().eq("user_id", getOwnerId());
  } catch {
    // best-effort
  }
}
