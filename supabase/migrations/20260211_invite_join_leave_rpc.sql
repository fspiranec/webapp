create or replace function public.get_join_event_details(eid uuid)
returns table (id uuid, title text, type text)
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
    select e.id, e.title, e.type
    from public.events e
    where e.id = eid
    limit 1;
  end if;
end;
$$;

grant execute on function public.get_join_event_details(uuid) to authenticated;

create or replace function public.touch_join_invite(eid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null or em = '' then
    return;
  end if;

  if exists (select 1 from public.event_invites i where i.event_id = eid and lower(i.email) = em) then
    return;
  end if;

  insert into public.event_invites(event_id, email, accepted, invited_by)
  values (eid, em, false, uid);
exception
  when unique_violation then
    null;
end;
$$;

grant execute on function public.touch_join_invite(uuid) to authenticated;

create or replace function public.join_event_via_link(eid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.event_members(event_id, user_id, rsvp)
  values (eid, uid, 'accepted')
  on conflict (event_id, user_id)
  do update set rsvp = 'accepted';

  if em <> '' then
    update public.event_invites
    set accepted = true
    where event_id = eid and lower(email) = em;

    if not found then
      begin
        insert into public.event_invites(event_id, email, accepted, invited_by)
        values (eid, em, true, uid);
      exception
        when unique_violation then
          update public.event_invites
          set accepted = true
          where event_id = eid and lower(email) = em;
      end;
    end if;
  end if;
end;
$$;

grant execute on function public.join_event_via_link(uuid) to authenticated;

create or replace function public.leave_event_keep_invite(eid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
  creator uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform public.leave_event(eid);

  if em = '' then
    return;
  end if;

  update public.event_invites
  set accepted = false
  where event_id = eid and lower(email) = em;

  if not found then
    select e.creator_id into creator from public.events e where e.id = eid;

    begin
      insert into public.event_invites(event_id, email, accepted, invited_by)
      values (eid, em, false, coalesce(creator, uid));
    exception
      when unique_violation then
        update public.event_invites
        set accepted = false
        where event_id = eid and lower(email) = em;
    end;
  end if;
end;
$$;

grant execute on function public.leave_event_keep_invite(uuid) to authenticated;
