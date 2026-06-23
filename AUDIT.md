# WhoopNess — Audit & Build Plan

A 15-agent (Opus) audit of the whole app, judged against the reality that this serves **one person on a phone**. ~110 findings. This doc is the working plan; check items off as they ship.

## Decisions (locked)
- **Greens = brand.** Recovery gets its **own** scale (clay → ochre → signal-green) and is **always shown with a verdict word** (READY / EASE OFF / RECOVER) so meaning never depends on hue.
- **Light earthy palette only** — dark theme dropped. Cream `#FBF5DD` paper, sand `#E7E1B1` surfaces, green `#306D29` brand, deep green `#0D530E`/`#14380F` ink.
- **Font: Fustat** (humanist, warm) for everything — replaces Inter + JetBrains Mono. Numbers use Fustat with tabular figures (no dev-tool monospace).
- **Quality over cost.** Use a strong model, called as needed (budget ~$10/mo; realistic spend ~$1–3). Caching only fixes correctness/latency, never downgrades the model.

## The 6 cross-cutting truths
1. **Built but unplugged.** Recovery is fetched then dropped in `TodayClient`; `RecoveryRing`, `VERDICT`, `KeystoneStatus` streak, `metrics.ts`, most of `evidence.ts` are orphaned; 3 of 4 Trends cards can never fill.
2. **Lossy round-trip / loop never closes.** Logging captures only kg/reps/minutes; `loadRecentLogs` strips everything to `{name,weight,reps}`; Trends shows none of it; no "done today" / streak.
3. **Per-day, stateless generation** can't produce a complementary week; rich WHOOP features are computed then ignored (band-only); the coach is blind to session/schedule/logs.
4. **Time & schedule fragility.** UTC date key vs local weekday (cards can vanish/dup); weekly-container schedule orphans edits; no idempotency.
5. **AI-feel** (real, named causes): Inter+JetBrains, `Sparkles` on Generate, ChatGPT bubbles, ~60 em-dashes, system prompts mandating "clinical" voice, identical cards.
6. **Tokens/infra.** Plan model can silently drop to mini; every Generate re-pays LLM + 4 WHOOP fetches; `limit=25` caps the "28-day" windows; not installable (no `public/` icons, no SW); dead deps.

## Model routing (quality-first)
| Call site | Model | max_tokens | Notes |
|---|---|---|---|
| Session generation | strong reasoning model, **pinned with hardcoded fallback** (never mini) | 1200 | called on every Generate/Regenerate; cache features per day for latency |
| Coach chat | strong/mid model | 600–700 | raise from 400 (truncation) |
| Guardrail / red-flag | **no LLM** (deterministic) | — | keep |

Fixes: `OPENROUTER_MODEL_PLAN ?? "<strong>"`; move coach post-reply DB insert out of the LLM try/catch (it can double-bill); cache WHOOP features + share one `fetchRecoveryRange`.

## Palette tokens & WCAG (cream `#FBF5DD` bg)
- Body ink `#14380F` 8.5:1 ✅ · secondary `#355E2C` ~6:1 ✅ · brand green `#306D29` 5.7:1 ✅
- Cards: sand `#E7E1B1` (dark-green text 7.0:1 ✅). **Never sand text on cream (1.2:1).**
- Recovery: success=signal green `#4F9E3F` (text `#2E7D24`), warning=ochre `#D69A33` (text `#8F6410`), danger=clay `#BB5436` (text `#9B3F22`) — all `-400` text variants clear AA on cream; always paired with a verdict word.

## Plan by phase

### P0 — Stop feeling broken / AI-made  ✅ shipped
- [x] Earthy + Fustat theme inversion (tokens, globals, layout, providers, manifest, surfaces)
- [x] Recovery hero on Today (wire the dropped score + VERDICT word)
- [x] Kill `Sparkles` on the action button
- [x] Replace ChatGPT bubbles with an editorial transcript
- [x] Rewrite the two system prompts to a human voice + de-dash the worst copy
- [x] Fix the UTC-vs-local day bug (one local-day helper for weekday + `card_date`)
- [x] Per-day log idempotency + draft persistence (localStorage); rehydrate logged state
- [x] PWA icon (SVG) + valid manifest  ·  ⚠ PNG 192/512 + service worker still TODO
- [x] Pin plan model w/ strong fallback; fix coach double-bill

### P2 — Close the loop + real intelligence  ✅ shipped
- [x] Full logging fields: treadmill speed/incline/distance, bike resistance, swim distance, RPE, per-set, pain/soreness note + session note; all carried to the AI
- [x] Wire Trends e1RM (from `session_logs`) + bodyweight trend + weigh-in; cut Harmony/volume; recovery chart now has dates  ·  ⚠ lazy-load recharts still TODO
- [x] Ground the coach (today's session + rationale + schedule + logs + features)
- [x] Week-aware generation (sees the other sessions) + per-lift last-performed + progression rules + repair loop  ·  full set-budget from `evidence.ts` still TODO
- [x] WHOOP feature glossary (plain-English digest) in the prompt; `daysSince*` computed from logs
- [x] Editable bodyweight via weigh-in (updates the live protein target)

### P1 / P3 — Remaining (deferred; deliberately not rushed to protect the working deploy)
- [ ] Surface hierarchy + one bespoke SVG recovery viz; header/branding consistency
- [ ] Delete dead code/deps (old type family, `validatePlan`/`selectBranch`, `fueling.ts`, `export {}` stubs, `zustand`/`framer-motion`) — left in place to avoid Netlify deletion-propagation risk; needs a clean-deploy verification pass
- [ ] PNG app icons + minimal app-shell service worker (true installability/offline)
- [ ] Lazy-load recharts; `React.cache()` per-request reads; single-flight token refresh
- [ ] Webhook persistence into `whoop_*`; read history from DB; fix `limit=25` pagination
- [ ] Replace weekly-container schedule with a fixed 3-row table; full per-muscle weekly budget
- [ ] Replace `window.confirm` with a HeroUI modal; coach one-tap "regenerate" action

### P4 — Coach actions (next)
- [ ] Let the coach actually *do* things (regenerate today / move a day) via a small intent layer
