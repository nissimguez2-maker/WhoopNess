"use server";

import { coachReply, type CoachReply, type CoachTurn } from "@/lib/claude/chat";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import { getOwnerRecovery, getOwnerWhoopFeatures } from "@/lib/whoop/sync";
import { ensureSchedule, loadDaySession, loadRecentLogs } from "@/lib/plan/store";
import { proteinTargetG } from "@/core/protein";
import { todaySlot } from "@/core/schedule";
import { todayKey, todayWeekday } from "@/lib/date";
import { DEFAULT_BODYWEIGHT } from "@/lib/today";

/** Build the coach's live context from the app's own state (not just a recovery %). */
async function buildContext(): Promise<string> {
  const admin = getSupabaseAdmin();
  const ownerId = getOwnerId();
  const date = todayKey();

  const [recovery, features, schedule, session, logs, profRes] = await Promise.all([
    getOwnerRecovery(ownerId),
    getOwnerWhoopFeatures(ownerId),
    ensureSchedule(admin, ownerId),
    loadDaySession(admin, ownerId, date),
    loadRecentLogs(admin, ownerId, 3),
    admin.from("profile").select("bodyweight_kg").eq("user_id", ownerId).maybeSingle(),
  ]);

  const slot = todaySlot(schedule, todayWeekday());
  const bw = Number(profRes.data?.bodyweight_kg ?? DEFAULT_BODYWEIGHT);

  const lines: string[] = [];
  lines.push(`Today (${date}) is a ${slot?.type ?? "rest"} day.`);
  if (recovery?.recoveryScore != null) lines.push(`Recovery ${recovery.recoveryScore}%${features?.fatigueState ? `, overall ${features.fatigueState}` : ""}.`);
  lines.push(`This week: ${schedule.map((s) => `${s.day} ${s.type}`).join(", ") || "not set"}.`);
  if (session) {
    const ex = session.exercises
      .map((e) => `${e.name} ${e.durationMin != null ? `${e.durationMin}min` : `${e.sets}×${e.reps}${e.loadKg != null ? ` @${e.loadKg}kg` : ""}`}`)
      .join("; ");
    lines.push(`Today's planned session: ${ex}. Why: ${session.rationale}`);
  } else {
    lines.push(`Today's session hasn't been generated yet.`);
  }
  if (logs.length) {
    lines.push(
      "Recent: " +
        logs.map((l) => `${l.date} ${l.type} (${l.exercises.filter((e) => e.done !== false).map((e) => e.name).slice(0, 5).join(", ")})`).join(" | "),
    );
  }
  lines.push(`Bodyweight ${bw}kg, protein target ~${proteinTargetG(bw)}g/day. Goal: maintenance recomposition; low-impact; knee/back guardrails.`);
  return lines.join("\n");
}

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
    const history: CoachTurn[] = chronological.slice(0, -1).map((m) => ({
      role: m.role === "coach" ? "coach" : "user",
      content: m.content as string,
    }));

    let context: string | undefined;
    try {
      context = await buildContext();
    } catch {
      context = undefined;
    }

    const reply = await coachReply(history, clean, context);
    // Persist the reply outside the LLM path so a write error never re-bills the model.
    try {
      await admin.from("chat_messages").insert({ user_id: ownerId, role: "coach", content: reply.text });
    } catch {
      /* best-effort */
    }
    return reply;
  } catch {
    return { source: "offline", text: "Couldn't reach me just now. Give it a second and try again." };
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
