-- Expense settings on events + shared expenses ledger.
alter table public.events
  add column if not exists expense_policy text not null default 'shared'
    check (expense_policy in ('host_covers_all', 'shared')),
  add column if not exists expenses_closed_at timestamptz;

create table if not exists public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  shared_with_all boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.event_expense_participants (
  expense_id uuid not null references public.event_expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (expense_id, user_id)
);

create index if not exists event_expenses_event_created_idx
  on public.event_expenses(event_id, created_at desc);

create index if not exists event_expense_participants_expense_idx
  on public.event_expense_participants(expense_id);

alter table public.event_expenses enable row level security;
alter table public.event_expense_participants enable row level security;

drop policy if exists "Members can read event expenses" on public.event_expenses;
create policy "Members can read event expenses"
on public.event_expenses
for select
to authenticated
using (
  exists (
    select 1
    from public.event_members m
    where m.event_id = event_expenses.event_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "Members can add own event expenses" on public.event_expenses;
create policy "Members can add own event expenses"
on public.event_expenses
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.event_members m
    where m.event_id = event_expenses.event_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "Expense owners or creator can edit/delete expenses" on public.event_expenses;
create policy "Expense owners or creator can edit/delete expenses"
on public.event_expenses
for update
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.events e
    where e.id = event_expenses.event_id
      and e.creator_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.events e
    where e.id = event_expenses.event_id
      and e.creator_id = auth.uid()
  )
);

drop policy if exists "Expense owners or creator can delete expenses" on public.event_expenses;
create policy "Expense owners or creator can delete expenses"
on public.event_expenses
for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.events e
    where e.id = event_expenses.event_id
      and e.creator_id = auth.uid()
  )
);

drop policy if exists "Members can read expense participants" on public.event_expense_participants;
create policy "Members can read expense participants"
on public.event_expense_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.event_expenses ex
    join public.event_members m on m.event_id = ex.event_id
    where ex.id = event_expense_participants.expense_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "Expense owners can manage participants" on public.event_expense_participants;
create policy "Expense owners can manage participants"
on public.event_expense_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.event_expenses ex
    where ex.id = event_expense_participants.expense_id
      and (
        ex.created_by = auth.uid()
        or exists (
          select 1 from public.events e
          where e.id = ex.event_id and e.creator_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Expense owners can delete participants" on public.event_expense_participants;
create policy "Expense owners can delete participants"
on public.event_expense_participants
for delete
to authenticated
using (
  exists (
    select 1
    from public.event_expenses ex
    where ex.id = event_expense_participants.expense_id
      and (
        ex.created_by = auth.uid()
        or exists (
          select 1 from public.events e
          where e.id = ex.event_id and e.creator_id = auth.uid()
        )
      )
  )
);
