alter table if exists public.event_polls
  add column if not exists closed_at timestamptz;
