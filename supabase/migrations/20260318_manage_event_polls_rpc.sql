create or replace function public.manage_event_poll(eid uuid, target_poll_id uuid, action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  poll_creator uuid;
  normalized_action text := lower(coalesce(action, ''));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.created_by
    into poll_creator
  from public.event_polls p
  where p.id = target_poll_id
    and p.event_id = eid
  limit 1;

  if poll_creator is null then
    raise exception 'Poll not found';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = eid
      and (e.creator_id = uid or poll_creator = uid)
  ) then
    raise exception 'Only the poll creator or event creator can manage this poll';
  end if;

  if normalized_action = 'close' then
    update public.event_polls
    set closed_at = now()
    where id = target_poll_id
      and event_id = eid;
    return;
  end if;

  if normalized_action = 'reopen' then
    update public.event_polls
    set closed_at = null
    where id = target_poll_id
      and event_id = eid;
    return;
  end if;

  if normalized_action = 'delete' then
    delete from public.event_poll_votes
    where event_id = eid
      and poll_id = target_poll_id;

    delete from public.event_poll_options
    where poll_id = target_poll_id;

    delete from public.event_polls
    where id = target_poll_id
      and event_id = eid;
    return;
  end if;

  raise exception 'Unsupported action';
end;
$$;

grant execute on function public.manage_event_poll(uuid, uuid, text) to authenticated;
