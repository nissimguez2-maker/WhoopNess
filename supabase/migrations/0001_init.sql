-- WhoopNess initial schema.
-- Principles: RLS on EVERY table; `user_id` on every row (future-proofs multi-user);
-- sensitive tables (tokens, webhooks, access log) get RLS enabled with NO client
-- policy → deny-all to client roles, service role only. Encrypt secrets at the app layer.

create extension if not exists "pgcrypto";

-- ── Profile & preferences ────────────────────────────────────────────────────
create table profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goal text not null default 'maintenance_recomp',
  bodyweight_kg numeric,
  target_weight_kg numeric default 74,
  training_days_per_week int default 3,
  coach_tone text default 'calm_clinical',
  autoreg_bias text default 'standard',     -- standard | conservative | push
  glp1_stage text default 'tapering',        -- on | tapering | off
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Medical (PHI-like) ───────────────────────────────────────────────────────
create table medical_constraints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                        -- 'hard' | 'advisory'
  label text not null,
  blocked_tags text[] default '{}',
  created_at timestamptz default now()
);

create table medical_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,                -- private bucket; access via signed URL only
  doc_type text,
  uploaded_at timestamptz default now()
);

create table lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_on date,
  marker text not null,                      -- e.g. 'ldl', 'uric_acid', 'alt'
  value numeric,
  unit text,
  flag text,                                 -- 'high' | 'low' | 'normal'
  created_at timestamptz default now()
);

-- ── WHOOP tokens (encrypted at rest; service role only) ──────────────────────
create table whoop_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token_enc text not null,            -- AES-256-GCM ciphertext
  refresh_token_enc text not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz default now()
);

-- ── WHOOP data (idempotent upserts keyed on WHOOP ids) ───────────────────────
create table whoop_recovery (
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id bigint,
  sleep_id uuid,
  recovery_score int,
  hrv_rmssd_milli numeric,
  resting_heart_rate int,
  spo2_percentage numeric,
  skin_temp_celsius numeric,
  created_at timestamptz,
  primary key (user_id, cycle_id)
);

create table whoop_sleep (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_ts timestamptz, end_ts timestamptz,
  performance_pct int, consistency_pct int, efficiency_pct numeric,
  respiratory_rate numeric, nap boolean,
  stage_summary jsonb, sleep_needed jsonb
);

create table whoop_cycles (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_ts timestamptz, end_ts timestamptz,
  strain numeric, kilojoule numeric, avg_hr int, max_hr int
);

create table whoop_workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_ts timestamptz, end_ts timestamptz,
  sport_name text, strain numeric, avg_hr int, max_hr int,
  kilojoule numeric, zone_durations jsonb
);

-- ── Exercise library + guardrail tags (safety-critical config) ───────────────
create table exercises (
  id text primary key,
  name text not null,
  primary_muscle text not null,
  secondary_muscles text[] default '{}',
  tags text[] not null default '{}',
  equipment text,
  fallback_safe boolean default false
);

-- ── Planning & logging ───────────────────────────────────────────────────────
create table weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  created_at timestamptz default now()
);

create table planned_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references weekly_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null,
  slot_time text,                            -- '07:00' | '21:00' | ...
  focus text,
  branches jsonb not null,                   -- [{band, exercises:[...]}]
  rationale text
);

create table session_logs (
  id uuid primary key,                       -- client-generated UUIDv7 (offline-first)
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_session_id uuid references planned_sessions(id) on delete set null,
  logged_at timestamptz default now(),
  status text not null,                      -- 'done' | 'skipped'
  sets jsonb default '[]',
  client_ts timestamptz
);

create table progression_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text references exercises(id),
  logged_on date,
  top_set_kg numeric, top_set_reps int, e1rm numeric
);

create table daily_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_date date not null,
  band text, recovery_score int,
  payload jsonb not null,                    -- pre-computed nightly for fast morning read
  created_at timestamptz default now(),
  primary key (user_id, card_date)
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,                        -- 'user' | 'coach'
  content text not null,
  created_at timestamptz default now()
);

-- ── Tripwire / infra (service role only) ─────────────────────────────────────
create table access_log (
  id bigserial primary key,
  user_id uuid,
  action text, resource text,
  at timestamptz default now()
);

create table webhook_events (
  id text primary key,                       -- WHOOP event id (idempotency)
  type text, received_at timestamptz default now(), processed boolean default false
);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Owner-scoped tables: enable RLS + owner policy.
do $$
declare t text;
begin
  foreach t in array array[
    'profile','medical_constraints','medical_documents','lab_results',
    'whoop_recovery','whoop_sleep','whoop_cycles','whoop_workouts',
    'weekly_plans','planned_sessions','session_logs','progression_history',
    'daily_cards','chat_messages'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      create policy %1$s_owner on %1$I
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- Deny-all to client roles (service role bypasses RLS): tokens, infra, library.
alter table whoop_tokens enable row level security;
alter table access_log enable row level security;
alter table webhook_events enable row level security;
-- exercises is shared reference data: readable by authenticated users.
alter table exercises enable row level security;
create policy exercises_read on exercises for select using (auth.role() = 'authenticated');
