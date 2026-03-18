alter table if exists public.events
  add column if not exists cover_image_path text;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Event images are public" on storage.objects;
create policy "Event images are public"
on storage.objects
for select
using (bucket_id = 'event-images');

drop policy if exists "Event creators can upload images" on storage.objects;
create policy "Event creators can upload images"
on storage.objects
for insert
with check (
  bucket_id = 'event-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.events e
    where e.id::text = (storage.foldername(name))[1]
      and e.creator_id = auth.uid()
  )
);

drop policy if exists "Event creators can update images" on storage.objects;
create policy "Event creators can update images"
on storage.objects
for update
using (
  bucket_id = 'event-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.events e
    where e.id::text = (storage.foldername(name))[1]
      and e.creator_id = auth.uid()
  )
)
with check (
  bucket_id = 'event-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.events e
    where e.id::text = (storage.foldername(name))[1]
      and e.creator_id = auth.uid()
  )
);

drop policy if exists "Event creators can delete images" on storage.objects;
create policy "Event creators can delete images"
on storage.objects
for delete
using (
  bucket_id = 'event-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.events e
    where e.id::text = (storage.foldername(name))[1]
      and e.creator_id = auth.uid()
  )
);
