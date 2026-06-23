import type { DaySession, PrescribedExercise, RecoveryBand, SessionType, WhoopFeatures } from "@/core/types";
import { EXERCISE_BY_ID, SWIM_COMPANION_IDS, WARMUP, COOLDOWN } from "@/core/exercises";
import { buildDaySession } from "@/core/planner";
import { proteinTargetG } from "@/core/protein";
import { EVIDENCE_NOTES } from "@/core/evidence";
import { llmComplete, llmConfigured } from "@/lib/llm";

export interface RecentLog {
  date: string;
  type: SessionType;
  exercises: Array<{ name: string; exerciseId?: string; weightKg?: number; reps?: number }>;
}

export interface GenerateDayInput {
  type: SessionType;
  band: RecoveryBand;
  recoveryScore?: number;
  features?: WhoopFeatures;
  recentLogs?: RecentLog[];
  bodyweightKg?: number;
  date: string;
  fallbackWalk?: boolean;
}

/** Allowed exercise ids for a session type (the only things the AI may propose). */
function allowedIdsFor(type: SessionType, fallbackWalk?: boolean): string[] {
  if (fallbackWalk) return ["city_walk"];
  if (type === "swim") return [...SWIM_COMPANION_IDS, "swimming"];
  // gym: everything except the pool + the standalone city walk
  return Object.keys(EXERCISE_BY_ID).filter((id) => id !== "swimming" && id !== "city_walk");
}

/**
 * Generate the day's session. "LLM proposes, rules dispose":
 * deterministic baseline → LLM refines within the approved list → validate → fallback.
 */
export async function generateDaySession(input: GenerateDayInput): Promise<DaySession> {
  const recentIds = new Set<string>();
  const lastLoads: Record<string, number> = {};
  for (const log of input.recentLogs ?? []) {
    for (const e of log.exercises) {
      if (e.exerciseId) {
        recentIds.add(e.exerciseId);
        if (e.weightKg) lastLoads[e.exerciseId] ??= e.weightKg;
      }
    }
  }

  const baseline = buildDaySession(input.type, input.band, input.date, {
    recoveryScore: input.recoveryScore,
    recentIds,
    lastLoads,
    bodyweightKg: input.bodyweightKg,
    fallbackWalk: input.fallbackWalk,
  });

  if (input.fallbackWalk || !llmConfigured()) return baseline;

  try {
    const refined = await authorWithLlm(input, baseline);
    if (refined) return refined;
  } catch {
    // fall through
  }
  return baseline;
}

async function authorWithLlm(input: GenerateDayInput, baseline: DaySession): Promise<DaySession | null> {
  const allowed = allowedIdsFor(input.type, input.fallbackWalk);
  const allowedSummary = allowed.map((id) => `${id} (${EXERCISE_BY_ID[id]!.name}; ${EXERCISE_BY_ID[id]!.category})`).join("\n");

  const history = (input.recentLogs ?? [])
    .slice(0, 6)
    .map((l) => `${l.date} ${l.type}: ${l.exercises.map((e) => `${e.name}${e.weightKg ? ` ${e.weightKg}kg` : ""}${e.reps ? `×${e.reps}` : ""}`).join(", ")}`)
    .join("\n") || "(no logged sessions yet)";

  const system = `You're Nissim's coach — you know strength training and knee/back rehab cold — building today's one session. Write like a person, not a textbook.

HARD RULES:
- Use ONLY exerciseId values from the ALLOWED list. Never invent movements.
- ${input.type === "swim" ? "This is a SWIM session: 1-2 companion exercises (push-ups/pull-ups/bike/walk) FIRST, then 'swimming' LAST (you're wet after)." : "This is a GYM session: ~5 exercises across push, pull, legs and core (knee/back-safe)."}
- Tune volume and intensity to today's recovery. Progress loads sensibly from your recent logs (small steps; cap ~10%/week).
- Vary from your last session so the week stays balanced across categories.
- Output STRICT JSON only.`;

  const user = `DATE: ${input.date}
TYPE: ${input.type}
RECOVERY: ${input.recoveryScore ?? "unknown"} (band ${input.band})
WHOOP: ${JSON.stringify(input.features ?? {})}

RECENT SESSIONS (most recent first):
${history}

EVIDENCE:
${EVIDENCE_NOTES.slice(0, 4).map((n) => "- " + n).join("\n")}

ALLOWED exerciseId list:
${allowedSummary}

Return JSON:
{"rationale":"1-2 plain sentences to Nissim: why today looks like this given your recovery, and how it builds on recent sessions","exercises":[{"exerciseId":"id","sets":3,"reps":"8-12","loadKg":60}]}
For cardio/swim use {"exerciseId":"id","durationMin":20} (omit sets/reps/load).`;

  const text = await llmComplete(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: process.env.OPENROUTER_MODEL_PLAN, maxTokens: 1200, temperature: 0.5 },
  );
  if (!text) return null;

  const parsed = parse(text);
  if (!parsed) return null;

  const exercises = mapAndValidate(parsed.exercises, input.type, new Set(allowed));
  if (!exercises) return null;

  const kind = input.type === "swim" ? "swim" : "gym";
  return {
    date: input.date,
    type: input.type,
    recoveryScore: input.recoveryScore,
    band: input.band,
    warmup: [...WARMUP[kind]],
    exercises,
    cooldown: [...COOLDOWN[kind]],
    rationale: parsed.rationale || baseline.rationale,
    proteinTargetG: proteinTargetG(input.bodyweightKg ?? 78),
  };
}

function mapAndValidate(
  raw: Array<Record<string, unknown>>,
  type: SessionType,
  allowed: Set<string>,
): PrescribedExercise[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: PrescribedExercise[] = [];
  for (const r of raw) {
    const id = String(r.exerciseId ?? "");
    const ex = EXERCISE_BY_ID[id];
    if (!ex || !allowed.has(id)) return null; // any off-list id → reject whole plan
    const durationMin = r.durationMin != null ? Number(r.durationMin) : undefined;
    out.push({
      exerciseId: id,
      name: ex.name,
      category: ex.category,
      sets: ex.isDuration ? 1 : Number(r.sets ?? 3),
      reps: ex.isDuration ? "—" : String(r.reps ?? "10-12"),
      loadKg: r.loadKg != null ? Number(r.loadKg) : undefined,
      durationMin: ex.isDuration ? durationMin ?? 20 : undefined,
      restSec: ex.defaultRestSec,
      cues: ex.cues ?? [],
    });
  }
  // Swim invariant: swimming must be present and last.
  if (type === "swim") {
    const swimIdx = out.findIndex((e) => e.exerciseId === "swimming");
    if (swimIdx === -1) return null;
    if (swimIdx !== out.length - 1) {
      const [swim] = out.splice(swimIdx, 1);
      out.push(swim!);
    }
  } else {
    if (out.some((e) => e.exerciseId === "swimming")) return null;
  }
  return out;
}

function parse(text: string): { rationale?: string; exercises: Array<Record<string, unknown>> } | null {
  try {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = m ? m[1]! : text;
    const s = body.indexOf("{");
    const e = body.lastIndexOf("}");
    const json = JSON.parse(s >= 0 ? body.slice(s, e + 1) : body);
    if (!Array.isArray(json.exercises)) return null;
    return json;
  } catch {
    return null;
  }
}
