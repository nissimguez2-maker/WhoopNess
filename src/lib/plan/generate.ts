import type { MedicalProfile, SessionType, WeeklyPlan, WhoopFeatures, PlannedSession, SessionBranch, RecoveryBand } from "@/core/types";
import { EXERCISES } from "@/core/exercises";
import { filterAllowedExercises, validatePlan } from "@/core/guardrails";
import { generateWeeklyPlan, defaultMix, type Slot } from "@/core/planner";
import { gymSwimMix, volumeBiasFor, VOLUME_LANDMARKS, EVIDENCE_NOTES, TARGET_FREQUENCY_PER_WEEK } from "@/core/evidence";
import { llmComplete, llmConfigured } from "@/lib/llm";

/**
 * The smart weekly plan engine. "LLM proposes, rules dispose":
 *   1) deterministic budget + gym/swim mix from WHOOP features (the brief),
 *   2) the LLM (OpenRouter, OPENROUTER_MODEL_PLAN) authors 3 complementary sessions
 *      within the guardrail-filtered allowed pool, citing the real WHOOP numbers,
 *   3) validatePlan gates it; on failure we re-prompt once, then fall back to the
 *      deterministic generator. The user can never receive an unsafe or off-type plan.
 */
export async function generateSmartWeek(input: {
  slots: Slot[];
  medical: MedicalProfile;
  weekStart: string;
  features?: WhoopFeatures;
}): Promise<WeeklyPlan> {
  const { slots, medical, weekStart } = input;
  const features = input.features ?? { fatigueState: "normal" as const };

  const counts = gymSwimMix(features);
  const mix = orderMix(counts.gym, counts.swim, slots.length);
  const bias = volumeBiasFor(features);

  // Deterministic baseline — always valid, used as the fallback.
  const baseline = generateWeeklyPlan(slots, medical, weekStart, { mix });
  const deterministicRationale = buildDeterministicRationale(features, counts, bias);

  if (!llmConfigured()) {
    return { ...baseline, rationale: deterministicRationale };
  }

  try {
    const llm = await authorWithLlm({ slots, medical, weekStart, features, mix, bias });
    if (llm) return llm;
  } catch {
    // fall through to deterministic
  }
  return { ...baseline, rationale: deterministicRationale };
}

async function authorWithLlm(input: {
  slots: Slot[];
  medical: MedicalProfile;
  weekStart: string;
  features: WhoopFeatures;
  mix: SessionType[];
  bias: number;
}): Promise<WeeklyPlan | null> {
  const allowed = filterAllowedExercises(EXERCISES, input.medical);
  const allowedSummary = allowed
    .map((e) => `${e.id} (${e.name}; ${e.primaryMuscle}; ${e.equipment}${e.tags.includes("swim_eligible") ? "; swim_eligible" : ""})`)
    .join("\n");

  const budget = Object.entries(VOLUME_LANDMARKS)
    .map(([m, l]) => `${m}: MEV ${l.mev} / target ~${Math.round(l.mav * input.bias)} / MRV ${l.mrv}`)
    .join("; ");

  const system = `You are an expert strength & conditioning coach and physiotherapist programming a week of training. Voice: precise, calm, clinical.

HARD RULES (non-negotiable):
- Use ONLY exercise ids from the ALLOWED list. Never invent ids or movements.
- A session is exactly one TYPE: "gym" or "swim". A SWIM session may contain ONLY swim_eligible ids (swim_easy, push_up, pull_up, walking, stationary_bike). A GYM session must NOT contain swim_easy.
- Respect the requested gym/swim mix and the per-muscle weekly volume budget; keep each gym session ~5 movements; train major muscles ≥${TARGET_FREQUENCY_PER_WEEK}×/week across the week.
- Keep ≥48h between heavy lower-body gym sessions; distribute fatigue so the 3 sessions complement each other.
- Each session needs exactly 3 branches: "green" (primary), "amber" (lighter), "red" (recovery/active).
- Output STRICT JSON only, no prose, matching the schema. Cite the user's real WHOOP numbers in the rationales.`;

  const user = `WEEK START: ${input.weekStart}
SLOTS (day/time/assigned type): ${input.slots.map((s, i) => `${s.day} ${s.time ?? ""} → ${input.mix[i]}`).join(", ")}

WHOOP FEATURES: ${JSON.stringify(input.features)}

EVIDENCE:
${EVIDENCE_NOTES.map((n) => "- " + n).join("\n")}

PER-MUSCLE WEEKLY SET BUDGET (volume bias ${input.bias.toFixed(2)} of MAV): ${budget}

ALLOWED EXERCISES:
${allowedSummary}

Return JSON exactly:
{
  "weeklyRationale": "2-3 sentences citing the WHOOP numbers and how the 3 sessions fit together",
  "sessions": [
    {
      "day": "Sun", "type": "gym", "focus": "short label", "rationale": "1 sentence",
      "branches": [
        {"band":"green","exercises":[{"exerciseId":"id","sets":3,"reps":"8-10","loadKg":60,"restSec":120}]},
        {"band":"amber","exercises":[{"exerciseId":"id","sets":2,"reps":"10-12"}]},
        {"band":"red","exercises":[{"exerciseId":"stationary_bike","durationMin":20,"sets":1,"reps":"—"}]}
      ]
    }
  ]
}
For swim/cardio movements use "durationMin" (and sets:1, reps:"—").`;

  // Up to 2 attempts: author, validate, repair.
  let lastViolations = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await llmComplete(
      [
        { role: "system", content: system },
        { role: "user", content: attempt === 0 ? user : `${user}\n\nYour previous output had these violations — fix them:\n${lastViolations}` },
      ],
      { model: process.env.OPENROUTER_MODEL_PLAN, maxTokens: 2000, temperature: 0.4 },
    );
    const parsed = text && parsePlan(text, input.slots, input.mix, input.weekStart);
    if (!parsed) continue;
    const res = validatePlan(parsed, input.medical);
    if (res.ok) return parsed;
    lastViolations = res.violations.map((v) => `${v.sessionDay}/${v.band} ${v.exerciseId}: ${v.reason}`).join("\n");
  }
  return null;
}

const BANDS: RecoveryBand[] = ["green", "amber", "red"];

function parsePlan(text: string, slots: Slot[], mix: SessionType[], weekStart: string): WeeklyPlan | null {
  try {
    const json = JSON.parse(stripFences(text)) as {
      weeklyRationale?: string;
      sessions?: Array<{ day?: string; type?: string; focus?: string; rationale?: string; branches?: Array<{ band?: string; exercises?: Array<Record<string, unknown>> }> }>;
    };
    if (!Array.isArray(json.sessions) || json.sessions.length === 0) return null;
    const sessions: PlannedSession[] = json.sessions.map((s, i) => {
      const type: SessionType = s.type === "swim" ? "swim" : "gym";
      const branches: SessionBranch[] = BANDS.map((band) => {
        const b = s.branches?.find((x) => x.band === band);
        return {
          band,
          exercises: (b?.exercises ?? []).map((e) => ({
            exerciseId: String(e.exerciseId ?? ""),
            sets: Number(e.sets ?? 1),
            reps: String(e.reps ?? "—"),
            loadKg: e.loadKg != null ? Number(e.loadKg) : undefined,
            rpe: e.rpe != null ? Number(e.rpe) : undefined,
            restSec: e.restSec != null ? Number(e.restSec) : undefined,
            durationMin: e.durationMin != null ? Number(e.durationMin) : undefined,
          })),
        };
      });
      return {
        day: s.day || slots[i]?.day || "Day",
        time: slots[i]?.time,
        type,
        focus: s.focus || (type === "swim" ? "Swim + upper" : "Full body"),
        rationale: s.rationale,
        branches,
      };
    });
    return { weekStart, sessions, rationale: json.weeklyRationale };
  } catch {
    return null;
  }
}

function stripFences(t: string): string {
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1]! : t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

function orderMix(gym: number, swim: number, n: number): SessionType[] {
  if (gym + swim !== n) return defaultMix(n);
  // Interleave so a swim sits between gym days (recovery spacing).
  if (gym === 2 && swim === 1) return ["gym", "swim", "gym"];
  if (gym === 1 && swim === 2) return ["swim", "gym", "swim"];
  const out: SessionType[] = [];
  for (let i = 0; i < gym; i++) out.push("gym");
  for (let i = 0; i < swim; i++) out.splice(i * 2 + 1, 0, "swim");
  return out.slice(0, n);
}

function buildDeterministicRationale(features: WhoopFeatures, counts: { gym: number; swim: number }, bias: number): string {
  const bits: string[] = [];
  if (features.recovery7dMean != null) bits.push(`7-day recovery ~${features.recovery7dMean}%`);
  if (features.recoverySlope != null) bits.push(features.recoverySlope >= 0 ? "trending up" : "trending down");
  if (features.acwr != null) bits.push(`acute:chronic strain ${features.acwr}`);
  const ctx = bits.length ? ` (${bits.join(", ")})` : "";
  const lean = bias < 0.95 ? "leaning lighter to protect recovery" : bias > 1.05 ? "pushing volume while you're fresh" : "holding steady at your adaptive volume";
  return `This week is ${counts.gym} gym + ${counts.swim} swim${ctx}, ${lean}. Swim sits between gym days to spare the knee, and volume targets each major muscle ${TARGET_FREQUENCY_PER_WEEK}×.`;
}
