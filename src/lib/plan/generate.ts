import type { DaySession, PrescribedExercise, RecoveryBand, SessionType, WhoopFeatures } from "@/core/types";
import { EXERCISE_BY_ID, SWIM_COMPANION_IDS, WARMUP, COOLDOWN } from "@/core/exercises";
import { buildDaySession } from "@/core/planner";
import { proteinTargetG } from "@/core/protein";
import { EVIDENCE_NOTES } from "@/core/evidence";
import { llmComplete, llmConfigured } from "@/lib/llm";

export interface RecentLogExercise {
  name: string;
  exerciseId?: string;
  done?: boolean;
  weightKg?: number;
  reps?: number;
  rpe?: number;
  durationMin?: number;
  speedKmh?: number;
  inclinePct?: number;
  distanceKm?: number;
  resistanceLevel?: number;
  distanceM?: number;
}

export interface RecentLog {
  date: string;
  type: SessionType;
  note?: string;
  kneePain?: number;
  backPain?: number;
  exercises: RecentLogExercise[];
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
  /** The week's 3 scheduled sessions, so the day can complement the others. */
  schedule?: Array<{ day: string; type: SessionType }>;
}

/** A strong model is the default for the high-stakes programming task; never silently mini. */
const PLAN_MODEL = process.env.OPENROUTER_MODEL_PLAN ?? "openai/gpt-4o";

/** Allowed exercise ids for a session type (the only things the AI may propose). */
function allowedIdsFor(type: SessionType, fallbackWalk?: boolean): string[] {
  if (fallbackWalk) return ["city_walk"];
  if (type === "swim") return [...SWIM_COMPANION_IDS, "swimming"];
  return Object.keys(EXERCISE_BY_ID).filter((id) => id !== "swimming" && id !== "city_walk");
}

/** Compact per-exercise summary for prompt history / last-performed. */
function describeLogExercise(e: RecentLogExercise): string {
  const parts: string[] = [e.name];
  if (e.weightKg != null) parts.push(`${e.weightKg}kg${e.reps != null ? `×${e.reps}` : ""}`);
  else if (e.reps != null) parts.push(`×${e.reps}`);
  if (e.rpe != null) parts.push(`@RPE${e.rpe}`);
  if (e.durationMin != null) parts.push(`${e.durationMin}min`);
  if (e.speedKmh != null) parts.push(`${e.speedKmh}km/h`);
  if (e.inclinePct != null) parts.push(`${e.inclinePct}%incl`);
  if (e.distanceKm != null) parts.push(`${e.distanceKm}km`);
  if (e.distanceM != null) parts.push(`${e.distanceM}m`);
  if (e.resistanceLevel != null) parts.push(`L${e.resistanceLevel}`);
  if (e.done === false) parts.push("(skipped)");
  return parts.join(" ");
}

/** Turn the rich WHOOP features into plain English the model can actually act on. */
function whoopSummary(f?: WhoopFeatures): string {
  if (!f) return "No WHOOP data today — program conservatively.";
  const bits: string[] = [];
  if (f.latestRecovery != null) bits.push(`recovery ${f.latestRecovery}%`);
  if (f.recovery7dMean != null) bits.push(`7-day avg ${f.recovery7dMean}%`);
  if (f.recoverySlope != null) {
    const dir = f.recoverySlope > 0.3 ? "improving" : f.recoverySlope < -0.3 ? "declining" : "flat";
    bits.push(`trend ${dir}`);
  }
  if (f.hrvDeviationSd != null) bits.push(`HRV ${f.hrvDeviationSd} SD vs baseline${f.hrvDeviationSd <= -1 ? " (notably low)" : ""}`);
  if (f.acwr != null) bits.push(`acute:chronic load ${f.acwr}${f.acwr > 1.5 ? " (spiking — ease volume)" : ""}`);
  if (f.sleep7dMean != null) bits.push(`sleep ${f.sleep7dMean}%`);
  if (f.fatigueState) bits.push(`overall: ${f.fatigueState}`);
  const recency: string[] = [];
  if (f.daysSinceGym != null) recency.push(`${f.daysSinceGym}d since gym`);
  if (f.daysSinceLowerBody != null) recency.push(`${f.daysSinceLowerBody}d since legs`);
  if (f.daysSinceSwim != null) recency.push(`${f.daysSinceSwim}d since swim`);
  return bits.join("; ") + (recency.length ? ` | ${recency.join(", ")}` : "");
}

/**
 * Generate the day's session. "LLM proposes, rules dispose":
 * deterministic baseline → strong LLM refines within the approved list (with one
 * repair attempt) → validate → fall back to baseline.
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
    // fall through to baseline
  }
  return baseline;
}

async function authorWithLlm(input: GenerateDayInput, baseline: DaySession): Promise<DaySession | null> {
  const allowed = allowedIdsFor(input.type, input.fallbackWalk);
  const allowedSet = new Set(allowed);
  const allowedSummary = allowed.map((id) => `${id} (${EXERCISE_BY_ID[id]!.name}; ${EXERCISE_BY_ID[id]!.category})`).join("\n");

  // Most-recent log per exercise → a "last performed" block to drive progression.
  const lastByEx: Record<string, RecentLogExercise> = {};
  for (const l of input.recentLogs ?? []) for (const e of l.exercises) if (e.exerciseId && !lastByEx[e.exerciseId]) lastByEx[e.exerciseId] = e;
  const lastBlock =
    allowed
      .filter((id) => lastByEx[id])
      .map((id) => `${id}: ${describeLogExercise(lastByEx[id]!)}`)
      .join("\n") || "(no history for these yet)";

  const history =
    (input.recentLogs ?? [])
      .slice(0, 6)
      .map((l) => {
        const ex = l.exercises.map(describeLogExercise).join(", ");
        const flags = [l.kneePain ? `knee pain ${l.kneePain}/3` : "", l.backPain ? `back pain ${l.backPain}/3` : "", l.note ? `note: ${l.note}` : ""].filter(Boolean).join("; ");
        return `${l.date} ${l.type}: ${ex}${flags ? ` [${flags}]` : ""}`;
      })
      .join("\n") || "(no logged sessions yet)";

  const week = (input.schedule ?? []).map((s) => `${s.day} ${s.type}`).join(", ") || "(not set)";

  const system = `You're Nissim's coach — you know strength training and knee/back rehab cold — building today's one session. Write like a person, not a textbook.

HARD RULES:
- Use ONLY exerciseId values from the ALLOWED list. Never invent movements.
- ${input.type === "swim" ? "SWIM session: 1-2 companions (push-ups/pull-ups/bike/walk) FIRST, then 'swimming' LAST (you're wet after)." : "GYM session: ~5 exercises across push, pull, legs and core (all knee/back-safe)."}
- Autoregulate to recovery: ease volume toward the low end when recovery is low/declining, HRV is below baseline, or acute load is spiking; push toward the top only when well-recovered.
- Progress per lift from LAST PERFORMED: if the last set hit the top of the rep range at RPE ≤8, add a small step (~2.5kg upper body, ~5kg lower body); otherwise repeat the load. Never jump more than ~10%.
- Respect the week: complement the other scheduled sessions; aim to hit each major muscle ~2×/week across the gym days and keep ≥48h between heavy leg days.
- If a recent log shows knee/back pain, back off that area.
- Output STRICT JSON only.`;

  const user = `DATE: ${input.date} — today is the ${input.type.toUpperCase()} session
THIS WEEK: ${week}
WHOOP: ${whoopSummary(input.features)}

LAST PERFORMED (most recent per exercise):
${lastBlock}

RECENT SESSIONS (newest first):
${history}

EVIDENCE:
${EVIDENCE_NOTES.map((n) => "- " + n).join("\n")}

ALLOWED exerciseId list:
${allowedSummary}

Return JSON only:
{"rationale":"1-2 plain sentences to Nissim: why today looks like this given your recovery, and how it builds on recent sessions","exercises":[{"exerciseId":"id","sets":3,"reps":"8-12","loadKg":60}]}
For cardio/swim use {"exerciseId":"id","durationMin":20} (omit sets/reps/load).`;

  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];

  let text = await llmComplete(messages, { model: PLAN_MODEL, maxTokens: 1400, temperature: 0.3 });
  let parsed = text ? parse(text) : null;
  let exercises = parsed ? mapAndValidate(parsed.exercises, input.type, allowedSet) : null;

  // One repair attempt, feeding back the violation, before falling back to baseline.
  if (!exercises) {
    const repair = await llmComplete(
      [
        ...messages,
        { role: "assistant" as const, content: text ?? "" },
        {
          role: "user" as const,
          content: `That response used an id outside the ALLOWED list or broke the rules. Re-emit STRICT JSON using ONLY these ids: ${allowed.join(", ")}.${input.type === "swim" ? " Companions first, 'swimming' last." : ""}`,
        },
      ],
      { model: PLAN_MODEL, maxTokens: 1400, temperature: 0.2 },
    );
    parsed = repair ? parse(repair) : parsed;
    exercises = parsed ? mapAndValidate(parsed.exercises, input.type, allowedSet) : null;
    text = repair ?? text;
  }
  if (!exercises) return null;

  const kind = input.type === "swim" ? "swim" : "gym";
  return {
    ...baseline,
    exercises,
    rationale: parsed?.rationale || baseline.rationale,
    warmup: [...WARMUP[kind]],
    cooldown: [...COOLDOWN[kind]],
    proteinTargetG: proteinTargetG(input.bodyweightKg ?? 78),
    source: "llm",
  };
}

function mapAndValidate(raw: Array<Record<string, unknown>>, type: SessionType, allowed: Set<string>): PrescribedExercise[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: PrescribedExercise[] = [];
  for (const r of raw) {
    const id = String(r.exerciseId ?? "");
    const ex = EXERCISE_BY_ID[id];
    if (!ex || !allowed.has(id)) return null; // any off-list id → reject (triggers repair)
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
  if (type === "swim") {
    const swimIdx = out.findIndex((e) => e.exerciseId === "swimming");
    if (swimIdx === -1) return null;
    if (swimIdx !== out.length - 1) {
      const [swim] = out.splice(swimIdx, 1);
      out.push(swim!);
    }
  } else if (out.some((e) => e.exerciseId === "swimming")) {
    return null;
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
