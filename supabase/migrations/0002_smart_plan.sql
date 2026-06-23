-- Smart planner + editable week: session typing (gym|swim) and stored plan rationale.
alter table planned_sessions add column if not exists session_type text not null default 'gym';
alter table weekly_plans add column if not exists rationale text;
alter table weekly_plans add column if not exists features jsonb;
