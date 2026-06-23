-- Dated weigh-ins so the recomp goal is measurable and chartable.
create table if not exists bodyweight_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null,
  kg numeric not null,
  created_at timestamptz default now(),
  primary key (user_id, logged_on)
);
alter table bodyweight_log enable row level security;
-- service-role only (single-owner app); no client policy by design.
