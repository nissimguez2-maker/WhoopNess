import type { SupabaseClient } from "@supabase/supabase-js";
import { NISSIM_MEDICAL_PROFILE } from "@/core/exercises";

/**
 * Seed the owner's profile + medical guardrails into the DB from the code defaults,
 * if not already present. Uses the service-role admin client (auth removed).
 */
export async function ensureUserBootstrap(admin: SupabaseClient, userId: string): Promise<void> {
  const { data: existing } = await admin.from("profile").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) return;

  await admin.from("profile").insert({
    user_id: userId,
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
      user_id: userId,
      kind: "hard",
      label: c.label,
      blocked_tags: c.blockedTags,
    })),
    ...NISSIM_MEDICAL_PROFILE.advisories.map((a) => ({
      user_id: userId,
      kind: "advisory",
      label: a,
      blocked_tags: [] as string[],
    })),
  ];
  await admin.from("medical_constraints").insert(constraints);
}
