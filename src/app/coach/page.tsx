import { CoachChat } from "@/components/CoachChat";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerId } from "@/lib/owner";
import type { CoachTurn } from "@/lib/claude/chat";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  let initial: CoachTurn[] = [];
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", getOwnerId())
      .order("created_at", { ascending: true })
      .limit(200);
    initial = (data ?? []).map((m) => ({ role: m.role === "coach" ? "coach" : "user", content: m.content as string }));
  } catch {
    initial = [];
  }
  return <CoachChat initialMessages={initial} />;
}
