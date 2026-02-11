create or replace function public.creator_uninvite(eid uuid, invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv_email text;
  member_uid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = eid and e.creator_id = uid
  ) then
    raise exception 'Only event creator can uninvite';
  end if;

  select lower(i.email)
    into inv_email
  from public.event_invites i
  where i.id = invite_id
    and i.event_id = eid
  limit 1;

  if inv_email is null then
    return;
  end if;

  delete from public.event_invites
  where id = invite_id
    and event_id = eid;

  select p.id
    into member_uid
  from public.profiles p
  where lower(coalesce(p.email, '')) = inv_email
  limit 1;

  if member_uid is not null then
    delete from public.event_members m
    where m.event_id = eid
      and m.user_id = member_uid;
  end if;
end;
$$;

grant execute on function public.creator_uninvite(uuid, uuid) to authenticated;
