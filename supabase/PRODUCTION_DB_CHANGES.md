# Supabase production DB changes checklist

This file lists **database-side work required** to make the app production-ready with the current feature set.

## 1) Email reminder safety + audit

### Why
- The API now authenticates the caller and resolves recipients server-side, but production should also keep an audit trail and enforce DB-side policy checks.

### SQL changes
```sql
create table if not exists public.event_email_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_count integer not null check (recipient_count >= 0),
  subject text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_email_audit_event_created_idx
  on public.event_email_audit(event_id, created_at desc);
```

### Optional RPC guard
```sql
create or replace function public.can_email_invitees(eid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = eid
      and e.creator_id = auth.uid()
  );
$$;

grant execute on function public.can_email_invitees(uuid) to authenticated;
```

---

## 2) Performance indexes for hot paths

### Why
- Event detail and dashboard screens repeatedly query invites, members, tasks, messages, and polls.

### SQL changes
```sql
create index if not exists event_invites_event_email_idx
  on public.event_invites(event_id, email);

create index if not exists event_members_event_user_idx
  on public.event_members(event_id, user_id);

create index if not exists event_tasks_event_assignee_status_idx
  on public.event_tasks(event_id, assignee_id, status);

create index if not exists event_messages_event_visibility_created_idx
  on public.event_messages(event_id, visibility, created_at desc);

create index if not exists event_poll_votes_event_poll_idx
  on public.event_poll_votes(event_id, poll_id);
```

---

## 3) Data integrity constraints

### Why
- Prevent inconsistent scheduling and malformed invite data.

### SQL changes
```sql
alter table public.events
  add constraint events_time_order_chk
  check (ends_at is null or starts_at is null or ends_at >= starts_at);

alter table public.event_invites
  add constraint event_invites_email_lower_chk
  check (email = lower(email));
```

---

## 4) Notification foundation (recommended)

### Why
- Supports future notification center (invite accepted, task assigned, poll closed, etc.).

### SQL changes
```sql
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications(user_id, read_at, created_at desc);
```

---

## 5) RLS policy hardening checklist

Confirm these policies exist and are tested:

1. `event_members`: users can read only rows for events they belong to.
2. `event_invites`: users can read only invites for their lowercase email (or event creators for their events).
3. `event_tasks`: secret tasks visible only to creator + assignee.
4. `event_messages`: `secret` visibility restricted by membership/policy intent.
5. `events`: update/delete limited to event creator.
6. `event_email_audit` / `user_notifications`: users read only their own rows unless admin context.

---

## 6) Migration operations checklist

- Apply all SQL in staging first.
- Backfill any existing uppercase invite emails:
```sql
update public.event_invites set email = lower(email) where email <> lower(email);
```
- Run `analyze` on frequently queried tables after index creation.
- Verify query plans for:
  - event detail loading
  - invites inbox
  - tasks by assignee
  - chat message timeline

---

## 7) Observability

Recommended Supabase-side monitoring:
- Postgres slow query logs enabled.
- Alert on failed auth in email API path.
- Alert on spikes in `event_email_audit` writes per sender/event.
