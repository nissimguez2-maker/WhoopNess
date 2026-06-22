import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NISSIM_MEDICAL_PROFILE } from "@/core/exercises";

/**
 * First-login bootstrap: seed the user's profile + medical guardrails into the live DB
 * from the code defaults, if not already present. Runs through the user's RLS-scoped
 * client (user_id = auth.uid()), so the inserts are owner-scoped and safe.
 */
export async function ensureUserBootstrap(supabase: SupabaseClient, user: User): Promise<void> {
  const { data: existing } = await supabase.from("profile").select("user_id").eq("user_id", user.id).maybeSingle();
  if (existing) return;

  await supabase.from("profile").insert({
    user_id: user.id,
    display_name: "Nissim",
    goal: "maintenance_recomp",
    bodyweight_kg: 78,
    target_weight_kg: 74,
    training_days_per_week: 3,
    coach_tone: "calm_clinical",
    autoreg_bias: "standard",
    glp1_stage: "tapering",
  });

  const constraints = [
    ...NISSIM_MEDICAL_PROFILE.hard.map((c) => ({
      user_id: user.id,
      kind: "hard",
      label: c.label,
      blocked_tags: c.blockedTags,
    })),
    ...NISSIM_MEDICAL_PROFILE.advisories.map((a) => ({
      user_id: user.id,
      kind: "advisory",
      label: a,
      blocked_tags: [] as string[],
    })),
  ];
  await supabase.from("medical_constraints").insert(constraints);
}
