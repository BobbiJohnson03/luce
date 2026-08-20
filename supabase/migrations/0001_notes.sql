-- Luce — Notes & Knowledge MVP
-- Incremental migration: adds the hierarchical notes feature (folders + notes).
-- Safe to run on an existing Luce database (idempotent).
--
-- Apply in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- (This same block is also mirrored in supabase/schema.sql, the canonical schema.)

-- ── Note folders (recursive hierarchy) ──────────────────────────────────────
create table if not exists public.note_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled folder',
  parent_id   uuid references public.note_folders (id) on delete cascade,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists note_folders_user_idx
  on public.note_folders (user_id);
create index if not exists note_folders_parent_idx
  on public.note_folders (user_id, parent_id);

alter table public.note_folders enable row level security;

drop policy if exists "note_folders are private" on public.note_folders;
create policy "note_folders are private"
  on public.note_folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Notes ───────────────────────────────────────────────────────────────────
-- content: block-editor document (BlockNote) stored as JSONB so structure is kept.
-- search_text: plain-text projection of title + content for cheap ILIKE search
--              (designed to later evolve into Postgres full-text search).
-- folder_id on delete cascade: deleting a folder removes its notes too, so a
--              folder delete cascades cleanly through the whole subtree with no orphans.
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  folder_id   uuid references public.note_folders (id) on delete cascade,
  title       text not null default 'Untitled',
  content     jsonb not null default '[]'::jsonb,
  search_text text not null default '',
  is_pinned   boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_user_idx
  on public.notes (user_id);
create index if not exists notes_folder_idx
  on public.notes (user_id, folder_id);
create index if not exists notes_pinned_idx
  on public.notes (user_id) where is_pinned;
create index if not exists notes_updated_idx
  on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes are private" on public.notes;
create policy "notes are private"
  on public.notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── updated_at maintenance ──────────────────────────────────────────────────
create or replace function public.luce_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists note_folders_set_updated_at on public.note_folders;
create trigger note_folders_set_updated_at
  before update on public.note_folders
  for each row execute function public.luce_set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.luce_set_updated_at();

-- ── Ownership integrity: a note may only live in a folder the user owns ──────
create or replace function public.notes_validate_folder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folder_id is not null
     and not exists (
       select 1 from public.note_folders f
       where f.id = new.folder_id and f.user_id = new.user_id
     ) then
    raise exception 'folder_id % does not belong to the note owner', new.folder_id;
  end if;
  return new;
end;
$$;

drop trigger if exists notes_validate_folder_trg on public.notes;
create trigger notes_validate_folder_trg
  before insert or update of folder_id, user_id on public.notes
  for each row execute function public.notes_validate_folder();

-- ── Hierarchy integrity: parent must be owned, and no cycles / self-parenting ─
create or replace function public.note_folders_validate_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cursor_id uuid;
  guard     int := 0;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'a folder cannot be its own parent';
  end if;

  if not exists (
    select 1 from public.note_folders f
    where f.id = new.parent_id and f.user_id = new.user_id
  ) then
    raise exception 'parent_id % does not belong to the folder owner', new.parent_id;
  end if;

  -- Walk up the ancestor chain; if we ever reach this folder, it is a cycle.
  cursor_id := new.parent_id;
  while cursor_id is not null and guard < 10000 loop
    if cursor_id = new.id then
      raise exception 'circular folder hierarchy is not allowed';
    end if;
    select parent_id into cursor_id from public.note_folders where id = cursor_id;
    guard := guard + 1;
  end loop;

  return new;
end;
$$;

drop trigger if exists note_folders_validate_parent_trg on public.note_folders;
create trigger note_folders_validate_parent_trg
  before insert or update of parent_id, user_id on public.note_folders
  for each row execute function public.note_folders_validate_parent();
