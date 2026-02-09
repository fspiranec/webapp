alter table if exists public.events
  add column if not exists ends_at timestamptz;

create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  visibility text not null default 'public' check (visibility in ('public', 'secret')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists event_tasks_event_id_idx on public.event_tasks(event_id);
create index if not exists event_tasks_assignee_id_idx on public.event_tasks(assignee_id);
