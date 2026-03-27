alter table public.event_tasks enable row level security;

drop policy if exists "Event members can view visible tasks" on public.event_tasks;
create policy "Event members can view visible tasks"
on public.event_tasks
for select
using (
  exists (
    select 1
    from public.event_members m
    where m.event_id = event_tasks.event_id
      and m.user_id = auth.uid()
  )
  and (
    event_tasks.visibility = 'public'
    or event_tasks.assignee_id = auth.uid()
    or exists (
      select 1
      from public.events e
      where e.id = event_tasks.event_id
        and e.creator_id = auth.uid()
    )
  )
);

drop policy if exists "Event creators can insert tasks" on public.event_tasks;
create policy "Event creators can insert tasks"
on public.event_tasks
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_tasks.event_id
      and e.creator_id = auth.uid()
  )
);

drop policy if exists "Creators and assignees can update tasks" on public.event_tasks;
create policy "Creators and assignees can update tasks"
on public.event_tasks
for update
using (
  exists (
    select 1
    from public.events e
    where e.id = event_tasks.event_id
      and e.creator_id = auth.uid()
  )
  or event_tasks.assignee_id = auth.uid()
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_tasks.event_id
      and e.creator_id = auth.uid()
  )
  or event_tasks.assignee_id = auth.uid()
);

drop policy if exists "Event creators can delete tasks" on public.event_tasks;
create policy "Event creators can delete tasks"
on public.event_tasks
for delete
using (
  exists (
    select 1
    from public.events e
    where e.id = event_tasks.event_id
      and e.creator_id = auth.uid()
  )
);
