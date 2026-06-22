# WhoopNess

A **private, single-user AI fitness coach**. It reads your **WHOOP** data, combines it with your preferences, an evidence base, and your **medical constraints**, and each morning shows **one decision**: what to train today, why, and how to fuel — autoregulated to your recovery.

> **The week is the plan, the day is the adjustment.**
> WHOOP supplies the objective signal; an evidence base + medical guardrails shape the decision; the Daily Card delivers it: **readiness verdict → recommended session → fueling → why → watch-outs.**

This app is **not affiliated with, endorsed by, or sponsored by WHOOP**. WHOOP is a trademark of WHOOP, Inc.

## Why it's different
Most wearable coaches are cardio-centric ("recovery low → skip the run"). WhoopNess autoregulates **resistance** training from recovery, encodes the user's **personal injuries** as hard guardrails enforced in code, and runs a **GLP-1 muscle-retention** (recomposition) mode. The per-muscle hypertrophy engine is something WHOOP's API can't provide — it's built here.

## Architecture
- **App:** Next.js 15 (App Router) + React 19 + TypeScript on Netlify. RSC shell + client islands; all LLM/guardrail calls run **server-side**.
- **UI:** HeroUI v2 + Tailwind v3, **dark-only**, calm/medical-grade (teal brand accent; recovery green/amber/red reserved strictly for data). Recharts for Trends. Installable PWA.
- **Data/auth:** Supabase (Postgres + Google Auth + Storage), **RLS on every table**, tokens encrypted at rest (AES-256-GCM).
- **LLM:** Claude — Opus 4.8 (weekly plan), Sonnet 4.6 (daily card + chat), Haiku 4.5 (trivial).
- **WHOOP:** OAuth 2.0 (+`offline`), HMAC-verified webhooks, nightly reconcile + Daily Card pre-compute.

### "LLM proposes, rules dispose"
Safety is code, never just a prompt. Three layers (`src/core/guardrails.ts`):
1. **L1 filter** — only guardrail-safe exercises are ever handed to the LLM.
2. **L2 schema** — the planning tool's exercise ids are enum-constrained.
3. **L3 validator** — every generated plan is re-checked; on failure it falls back to a hand-authored knee-safe template.
Plus deterministic **red-flag escalation** ("pause & see a clinician").

## Repository layout
```
src/core/        # framework-agnostic domain core (pure TS, fully tested)
  exercises.ts   #   seed library + guardrail tags + medical profile
  guardrails.ts  #   L1 filter, L3 validator, progression cap, red-flag detection
  recovery.ts    #   recovery -> green/amber/red band + branch selection
  metrics.ts     #   Epley e1RM, per-muscle volume, harmony balance score
  fueling.ts     #   maintenance-recomp targets + GLP-1 taper logic
src/lib/         # integration layer
  whoop/         #   OAuth, API client, webhook signature verification
  claude/        #   coach (narration; LLM proposes, rules dispose)
  supabase/      #   admin (service role) + browser clients
  crypto.ts      #   AES-256-GCM envelope encryption for tokens at rest
src/components/  # HeroUI UI (Daily Card, verdict band, recovery ring, nav)
src/app/         # Next.js App Router (Today/Week/Trends/Coach, api routes, privacy)
supabase/migrations/  # Postgres schema + RLS
```

## Setup
1. **Install:** `npm install --legacy-peer-deps`
2. **Env:** `cp .env.example .env.local` and fill in (see below). Generate the encryption key with `openssl rand -base64 32`.
3. **WHOOP developer app** (https://developer.whoop.com): set the **Redirect URL** to `http://localhost:3000/api/whoop/callback`, the **Privacy Policy URL** to your hosted `/privacy`, and the scopes `read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline`. Copy the Client ID/Secret into `.env.local`.
4. **Supabase:** create a project, enable Google auth (allowlist your email), run `supabase/migrations/0001_init.sql`, and copy the URL + anon + service-role keys into `.env.local`.
5. **Run:** `npm run dev` → http://localhost:3000

## Scripts
| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (domain core + crypto/signature) |

## Status
Foundation + safety core (tested) + dark HeroUI app shell with a working Daily Card (driven by the real core logic) + WHOOP/Claude/Supabase integration scaffolding + DB schema. Next: wire live WHOOP data + Supabase persistence, the weekly planner, Recharts Trends + harmony body-map, and the chat coach. See the full plan in `/root/.claude/plans/sunny-humming-giraffe.md`.

⚠️ This is a personal decision-support tool, **not a medical device**. It adapts and flags; it does not diagnose. Validate the medical guardrails with your physician.
