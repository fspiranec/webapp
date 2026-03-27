-- Expand join link event context so the UI can show start time, location, and host name.
create or replace function public.get_join_event_details(eid uuid)
returns table (
  id uuid,
  title text,
  type text,
  starts_at timestamptz,
  location text,
  creator_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then
    return;
  end if;

  if exists (
    select 1 from public.events e where e.id = eid and e.creator_id = uid
  )
  or exists (
    select 1 from public.event_members m where m.event_id = eid and m.user_id = uid
  )
  or (em <> '' and exists (
    select 1 from public.event_invites i where i.event_id = eid and lower(i.email) = em
  )) then
    return query
    select
      e.id,
      e.title,
      e.type,
      e.starts_at,
      e.location,
      p.full_name::text as creator_name
    from public.events e
    left join public.profiles p on p.id = e.creator_id
    where e.id = eid
    limit 1;
  end if;
end;
$$;

grant execute on function public.get_join_event_details(uuid) to authenticated;

-- Let users update only their own membership rows (used by invite RSVP quick actions).
alter table public.event_members enable row level security;

drop policy if exists "Members can update own RSVP" on public.event_members;
create policy "Members can update own RSVP"
on public.event_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

