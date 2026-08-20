-- Luce — database schema
-- Uruchom w Supabase: Dashboard → SQL Editor → wklej i wykonaj.
-- Tworzy tabele dla kalendarza (events) i zadań (todos) z Row Level Security,
-- tak aby każdy użytkownik widział i modyfikował wyłącznie własne dane.

-- ── Events (kalendarz) ──────────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_date  date not null,
  title       text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists events_user_date_idx
  on public.events (user_id, event_date);

alter table public.events enable row level security;

drop policy if exists "events are private" on public.events;
create policy "events are private"
  on public.events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Todos (zadania) ─────────────────────────────────────────────────────────
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists todos_user_idx
  on public.todos (user_id, created_at);

alter table public.todos enable row level security;

drop policy if exists "todos are private" on public.todos;
create policy "todos are private"
  on public.todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Notes & Knowledge (see supabase/migrations/0001_notes.sql) ───────────────
-- Hierarchical folders + block-editor notes. Kept in sync with the incremental
-- migration file so this schema stays a complete, re-runnable snapshot.

-- Note folders (recursive hierarchy)
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

-- Notes (content stored as JSONB, search_text is a plain-text projection)
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

-- ── Languages (see supabase/migrations/0002_language_profiles.sql) ──────────
-- One active profile per learned BCP 47 language code and user. Removing a
-- profile archives it by default; archived rows retain their history.

create table if not exists public.language_profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  language_code             text not null,
  language_name             text not null,
  translation_language_code text not null,
  translation_language_name text not null,
  current_cefr              text,
  target_cefr               text,
  daily_goal_minutes        smallint,
  position                  integer not null default 0,
  archived_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint language_profiles_language_code_format_check
    check (language_code ~ '^[a-z]{2,8}(-[a-z0-9]{1,8})*$'),
  constraint language_profiles_translation_language_code_format_check
    check (translation_language_code ~ '^[a-z]{2,8}(-[a-z0-9]{1,8})*$'),
  constraint language_profiles_language_name_check
    check (btrim(language_name) <> ''),
  constraint language_profiles_translation_language_name_check
    check (btrim(translation_language_name) <> ''),
  constraint language_profiles_current_cefr_check
    check (current_cefr is null or current_cefr in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  constraint language_profiles_target_cefr_check
    check (target_cefr is null or target_cefr in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  constraint language_profiles_daily_goal_minutes_check
    check (daily_goal_minutes is null or daily_goal_minutes between 1 and 1440),
  constraint language_profiles_position_check
    check (position >= 0)
);

create unique index if not exists language_profiles_user_active_language_idx
  on public.language_profiles (user_id, language_code)
  where archived_at is null;

create index if not exists language_profiles_user_active_position_idx
  on public.language_profiles (user_id, position)
  where archived_at is null;

create index if not exists language_profiles_user_archived_idx
  on public.language_profiles (user_id, archived_at);

alter table public.language_profiles enable row level security;

drop policy if exists "users can view own language profiles" on public.language_profiles;
create policy "users can view own language profiles"
  on public.language_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can create own language profiles" on public.language_profiles;
create policy "users can create own language profiles"
  on public.language_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own language profiles" on public.language_profiles;
create policy "users can update own language profiles"
  on public.language_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete own language profiles" on public.language_profiles;
create policy "users can delete own language profiles"
  on public.language_profiles
  for delete
  using (auth.uid() = user_id);

-- updated_at maintenance
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

drop trigger if exists language_profiles_set_updated_at on public.language_profiles;
create trigger language_profiles_set_updated_at
  before update on public.language_profiles
  for each row execute function public.luce_set_updated_at();

-- Normalize case-insensitive BCP 47 tags before checks and unique indexes run.
create or replace function public.luce_normalize_language_profile_codes()
returns trigger
language plpgsql
as $$
begin
  new.language_code := lower(btrim(new.language_code));
  new.translation_language_code := lower(btrim(new.translation_language_code));
  return new;
end;
$$;

drop trigger if exists language_profiles_normalize_codes on public.language_profiles;
create trigger language_profiles_normalize_codes
  before insert or update of language_code, translation_language_code
  on public.language_profiles
  for each row execute function public.luce_normalize_language_profile_codes();

-- Ownership integrity: a note may only live in a folder the user owns
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

-- Hierarchy integrity: parent must be owned, and no cycles / self-parenting
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
