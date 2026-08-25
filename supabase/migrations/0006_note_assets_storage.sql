-- Luce — private Note image assets
-- Incremental migration: creates the private Storage bucket and ownership
-- policies required by BlockNote image uploads.
--
-- Apply manually in the verified Supabase Dashboard → SQL Editor.
-- Do not make this bucket public.

-- Bucket-level restrictions are the authoritative server-side MIME and size
-- checks. The application repeats them only to provide faster, localized UX.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'note-assets',
  'note-assets',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object names must have exactly this shape:
--   <authenticated-user-id>/<owned-note-id>/<generated-image-id>.<extension>
--
-- The first segment prevents cross-user namespace writes. The second segment
-- is checked against public.notes so a valid user UUID alone is insufficient:
-- the target Note must exist and belong to the authenticated user. Filenames
-- are generated UUIDs; user-supplied filenames never become object paths.
drop policy if exists "users can upload images to own notes"
  on storage.objects;
create policy "users can upload images to own notes"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'note-assets'
    and owner_id = (select auth.uid()::text)
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|gif)$'
    and exists (
      select 1
      from public.notes note
      where note.id::text = (storage.foldername(name))[2]
        and note.user_id = auth.uid()
    )
  );

-- Private rendering uses authenticated reads to mint short-lived signed URLs.
-- The same namespace, Storage owner, and current Note ownership are all
-- required. Once a Note is deleted, its orphaned assets become inaccessible.
drop policy if exists "users can read images from own notes"
  on storage.objects;
create policy "users can read images from own notes"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'note-assets'
    and owner_id = (select auth.uid()::text)
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.notes note
      where note.id::text = (storage.foldername(name))[2]
        and note.user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policy is added in this checkpoint. Uploads use unique
-- paths with upsert disabled, and removing a BlockNote image is not sufficient
-- proof that the object is unreferenced. Safe orphan cleanup remains a future
-- maintenance concern.
