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

-- Composite ownership key used by Language ↔ Notes association foreign keys.
create unique index if not exists notes_id_user_idx
  on public.notes (id, user_id);

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

-- ── Language vocabulary & semantic topics ──────────────────────────────────
-- See supabase/migrations/0003_language_vocabulary_topics.sql. Vocabulary
-- content is intentionally separate from future scheduling and learning state.

create unique index if not exists language_profiles_id_user_idx
  on public.language_profiles (id, user_id);

-- Semantic topics (recursive hierarchy)
create table if not exists public.language_topics (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  language_profile_id uuid not null,
  parent_id           uuid,
  name                text not null,
  description         text,
  position            integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint language_topics_owner_key
    unique (id, user_id, language_profile_id),
  constraint language_topics_profile_owner_fk
    foreign key (language_profile_id, user_id)
    references public.language_profiles (id, user_id)
    on delete cascade,
  constraint language_topics_parent_owner_profile_fk
    foreign key (parent_id, user_id, language_profile_id)
    references public.language_topics (id, user_id, language_profile_id)
    on delete cascade,
  constraint language_topics_name_check
    check (btrim(name) <> ''),
  constraint language_topics_position_check
    check (position >= 0),
  constraint language_topics_not_self_parent_check
    check (parent_id is null or parent_id <> id)
);

create index if not exists language_topics_profile_parent_position_idx
  on public.language_topics (user_id, language_profile_id, parent_id, position);

create unique index if not exists language_topics_root_name_idx
  on public.language_topics (user_id, language_profile_id, lower(btrim(name)))
  where parent_id is null;

create unique index if not exists language_topics_child_name_idx
  on public.language_topics (
    user_id,
    language_profile_id,
    parent_id,
    lower(btrim(name))
  )
  where parent_id is not null;

-- Durable vocabulary content (no SRS or review state)
create table if not exists public.vocabulary_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  language_profile_id uuid not null,
  term                text not null,
  translation         text not null,
  definition          text,
  part_of_speech      text,
  gender              text,
  plural              text,
  pronunciation       text,
  ipa                 text,
  example_sentence    text,
  example_translation text,
  notes               text,
  archived_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint vocabulary_items_owner_key
    unique (id, user_id, language_profile_id),
  constraint vocabulary_items_profile_owner_fk
    foreign key (language_profile_id, user_id)
    references public.language_profiles (id, user_id)
    on delete cascade,
  constraint vocabulary_items_term_check
    check (btrim(term) <> ''),
  constraint vocabulary_items_translation_check
    check (btrim(translation) <> '')
);

create index if not exists vocabulary_items_profile_active_created_idx
  on public.vocabulary_items (user_id, language_profile_id, created_at desc)
  where archived_at is null;

create index if not exists vocabulary_items_profile_archived_idx
  on public.vocabulary_items (user_id, language_profile_id, archived_at);

create index if not exists vocabulary_items_active_term_search_idx
  on public.vocabulary_items (
    user_id,
    language_profile_id,
    lower(term) text_pattern_ops
  )
  where archived_at is null;

create index if not exists vocabulary_items_active_translation_search_idx
  on public.vocabulary_items (
    user_id,
    language_profile_id,
    lower(translation) text_pattern_ops
  )
  where archived_at is null;

-- Many-to-many vocabulary/topic associations
create table if not exists public.vocabulary_topics (
  user_id             uuid not null references auth.users (id) on delete cascade,
  language_profile_id uuid not null,
  vocabulary_item_id  uuid not null,
  language_topic_id   uuid not null,
  created_at          timestamptz not null default now(),

  constraint vocabulary_topics_pkey
    primary key (vocabulary_item_id, language_topic_id),
  constraint vocabulary_topics_vocabulary_owner_profile_fk
    foreign key (vocabulary_item_id, user_id, language_profile_id)
    references public.vocabulary_items (id, user_id, language_profile_id)
    on delete cascade,
  constraint vocabulary_topics_topic_owner_profile_fk
    foreign key (language_topic_id, user_id, language_profile_id)
    references public.language_topics (id, user_id, language_profile_id)
    on delete cascade
);

create index if not exists vocabulary_topics_topic_lookup_idx
  on public.vocabulary_topics (
    user_id,
    language_profile_id,
    language_topic_id,
    vocabulary_item_id
  );

create index if not exists vocabulary_topics_vocabulary_lookup_idx
  on public.vocabulary_topics (
    user_id,
    language_profile_id,
    vocabulary_item_id,
    language_topic_id
  );

drop trigger if exists language_topics_set_updated_at on public.language_topics;
create trigger language_topics_set_updated_at
  before update on public.language_topics
  for each row execute function public.luce_set_updated_at();

drop trigger if exists vocabulary_items_set_updated_at on public.vocabulary_items;
create trigger vocabulary_items_set_updated_at
  before update on public.vocabulary_items
  for each row execute function public.luce_set_updated_at();

-- Parent must be in the same profile, and self-parenting/cycles are rejected.
create or replace function public.language_topics_validate_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cursor_id uuid;
  guard     integer := 0;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'a language topic cannot be its own parent';
  end if;

  if not exists (
    select 1
    from public.language_topics topic
    where topic.id = new.parent_id
      and topic.user_id = new.user_id
      and topic.language_profile_id = new.language_profile_id
  ) then
    raise exception 'parent topic must belong to the same user and language profile';
  end if;

  cursor_id := new.parent_id;
  while cursor_id is not null and guard < 10000 loop
    if cursor_id = new.id then
      raise exception 'circular language topic hierarchy is not allowed';
    end if;

    select topic.parent_id
      into cursor_id
      from public.language_topics topic
      where topic.id = cursor_id
        and topic.user_id = new.user_id
        and topic.language_profile_id = new.language_profile_id;

    guard := guard + 1;
  end loop;

  if guard >= 10000 then
    raise exception 'language topic hierarchy exceeds the supported depth';
  end if;

  return new;
end;
$$;

drop trigger if exists language_topics_validate_parent_trg on public.language_topics;
create trigger language_topics_validate_parent_trg
  before insert or update of parent_id, user_id, language_profile_id
  on public.language_topics
  for each row execute function public.language_topics_validate_parent();

alter table public.language_topics enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.vocabulary_topics enable row level security;

drop policy if exists "users can view own language topics" on public.language_topics;
create policy "users can view own language topics"
  on public.language_topics
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can create topics in own active language profiles"
  on public.language_topics;
create policy "users can create topics in own active language profiles"
  on public.language_topics
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.language_profiles profile
      where profile.id = language_profile_id
        and profile.user_id = auth.uid()
        and profile.archived_at is null
    )
  );

drop policy if exists "users can update own language topics" on public.language_topics;
create policy "users can update own language topics"
  on public.language_topics
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.language_profiles profile
      where profile.id = language_profile_id
        and profile.user_id = auth.uid()
        and profile.archived_at is null
    )
  );

drop policy if exists "users can delete own language topics" on public.language_topics;
create policy "users can delete own language topics"
  on public.language_topics
  for delete
  using (auth.uid() = user_id);

drop policy if exists "users can view own vocabulary" on public.vocabulary_items;
create policy "users can view own vocabulary"
  on public.vocabulary_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can create vocabulary in own active language profiles"
  on public.vocabulary_items;
create policy "users can create vocabulary in own active language profiles"
  on public.vocabulary_items
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.language_profiles profile
      where profile.id = language_profile_id
        and profile.user_id = auth.uid()
        and profile.archived_at is null
    )
  );

drop policy if exists "users can update own vocabulary" on public.vocabulary_items;
create policy "users can update own vocabulary"
  on public.vocabulary_items
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.language_profiles profile
      where profile.id = language_profile_id
        and profile.user_id = auth.uid()
        and profile.archived_at is null
    )
  );

drop policy if exists "users can delete own vocabulary" on public.vocabulary_items;
create policy "users can delete own vocabulary"
  on public.vocabulary_items
  for delete
  using (auth.uid() = user_id);

drop policy if exists "users can view own vocabulary topic associations"
  on public.vocabulary_topics;
create policy "users can view own vocabulary topic associations"
  on public.vocabulary_topics
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.vocabulary_items item
      where item.id = vocabulary_topics.vocabulary_item_id
        and item.user_id = auth.uid()
        and item.language_profile_id = vocabulary_topics.language_profile_id
    )
    and exists (
      select 1
      from public.language_topics topic
      where topic.id = vocabulary_topics.language_topic_id
        and topic.user_id = auth.uid()
        and topic.language_profile_id = vocabulary_topics.language_profile_id
    )
  );

drop policy if exists "users can assign own vocabulary to own topics"
  on public.vocabulary_topics;
create policy "users can assign own vocabulary to own topics"
  on public.vocabulary_topics
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.vocabulary_items item
      join public.language_profiles profile
        on profile.id = item.language_profile_id
       and profile.user_id = item.user_id
      where item.id = vocabulary_topics.vocabulary_item_id
        and item.user_id = auth.uid()
        and item.language_profile_id = vocabulary_topics.language_profile_id
        and item.archived_at is null
        and profile.archived_at is null
    )
    and exists (
      select 1
      from public.language_topics topic
      where topic.id = vocabulary_topics.language_topic_id
        and topic.user_id = auth.uid()
        and topic.language_profile_id = vocabulary_topics.language_profile_id
    )
  );

drop policy if exists "users can remove own vocabulary topic associations"
  on public.vocabulary_topics;
create policy "users can remove own vocabulary topic associations"
  on public.vocabulary_topics
  for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.vocabulary_items item
      where item.id = vocabulary_topics.vocabulary_item_id
        and item.user_id = auth.uid()
        and item.language_profile_id = vocabulary_topics.language_profile_id
    )
    and exists (
      select 1
      from public.language_topics topic
      where topic.id = vocabulary_topics.language_topic_id
        and topic.user_id = auth.uid()
        and topic.language_profile_id = vocabulary_topics.language_profile_id
    )
  );

-- ── Language review & spaced repetition, FSRS ───────────────────────────────
-- See supabase/migrations/0004_language_review_srs.sql. Scheduling state is kept
-- separate from vocabulary content; every write goes through record_review.

-- Scheduler state (one row per vocabulary item). Mirrors the ts-fsrs Card shape.
-- state: 0 New, 1 Learning, 2 Review, 3 Relearning. row_version is the
-- optimistic-concurrency guard against stale simultaneous tabs.
create table if not exists public.vocabulary_srs_states (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  language_profile_id uuid not null,
  vocabulary_item_id  uuid not null,

  due                 timestamptz not null default now(),
  stability           double precision not null default 0,
  difficulty          double precision not null default 0,
  elapsed_days        integer not null default 0,
  scheduled_days      integer not null default 0,
  learning_steps      integer not null default 0,
  reps                integer not null default 0,
  lapses              integer not null default 0,
  state               smallint not null default 0,
  last_review         timestamptz,

  scheduler           text not null default 'fsrs',
  scheduler_version   smallint not null default 1,
  row_version         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint vocabulary_srs_states_item_unique
    unique (vocabulary_item_id),
  constraint vocabulary_srs_states_owner_key
    unique (id, user_id, language_profile_id),
  constraint vocabulary_srs_states_item_owner_fk
    foreign key (vocabulary_item_id, user_id, language_profile_id)
    references public.vocabulary_items (id, user_id, language_profile_id)
    on delete cascade,
  constraint vocabulary_srs_states_state_check
    check (state between 0 and 3),
  constraint vocabulary_srs_states_row_version_check
    check (row_version >= 0)
);

create index if not exists vocabulary_srs_states_due_idx
  on public.vocabulary_srs_states (user_id, language_profile_id, due);

-- Study sessions (shared Review + future Practice engine).
create table if not exists public.study_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  language_profile_id uuid not null,
  session_kind        text not null default 'scheduled_review',
  exercise_mode       text not null default 'flashcard',
  launch_source       text,
  configuration       jsonb not null default '{}'::jsonb,
  status              text not null default 'active',
  initial_item_count  integer not null default 0,
  duration_ms         integer,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),

  constraint study_sessions_owner_key
    unique (id, user_id, language_profile_id),
  constraint study_sessions_profile_owner_fk
    foreign key (language_profile_id, user_id)
    references public.language_profiles (id, user_id)
    on delete cascade,
  constraint study_sessions_kind_check
    check (session_kind in ('scheduled_review', 'practice')),
  constraint study_sessions_status_check
    check (status in ('active', 'completed', 'abandoned')),
  constraint study_sessions_initial_count_check
    check (initial_item_count >= 0),
  constraint study_sessions_duration_check
    check (duration_ms is null or duration_ms >= 0)
);

create index if not exists study_sessions_profile_status_idx
  on public.study_sessions (user_id, language_profile_id, status, started_at desc);

-- Review events (immutable history). rating: 1 Again, 2 Hard, 3 Good, 4 Easy.
create table if not exists public.review_events (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  language_profile_id  uuid not null,
  study_session_id     uuid not null,
  vocabulary_item_id   uuid not null,

  rating               smallint not null,
  exercise_mode        text not null default 'flashcard',
  affected_schedule    boolean not null default true,
  response_time_ms     integer,
  reviewed_at          timestamptz not null default now(),

  scheduler            text not null default 'fsrs',
  scheduler_version    smallint not null default 1,
  previous_state       jsonb,
  resulting_state      jsonb,
  previous_card_state  smallint,
  resulting_card_state smallint,
  previous_due         timestamptz,
  resulting_due        timestamptz,
  scheduled_days       integer,
  created_at           timestamptz not null default now(),

  constraint review_events_rating_check
    check (rating between 1 and 4),
  constraint review_events_response_time_check
    check (response_time_ms is null or response_time_ms >= 0),
  constraint review_events_session_owner_fk
    foreign key (study_session_id, user_id, language_profile_id)
    references public.study_sessions (id, user_id, language_profile_id)
    on delete cascade,
  constraint review_events_item_owner_fk
    foreign key (vocabulary_item_id, user_id, language_profile_id)
    references public.vocabulary_items (id, user_id, language_profile_id)
    on delete cascade
);

create index if not exists review_events_profile_time_idx
  on public.review_events (user_id, language_profile_id, reviewed_at desc);

create index if not exists review_events_session_idx
  on public.review_events (study_session_id, reviewed_at);

create index if not exists review_events_item_time_idx
  on public.review_events (vocabulary_item_id, reviewed_at desc);

drop trigger if exists vocabulary_srs_states_set_updated_at
  on public.vocabulary_srs_states;
create trigger vocabulary_srs_states_set_updated_at
  before update on public.vocabulary_srs_states
  for each row execute function public.luce_set_updated_at();

-- Every new vocabulary item gets a default "New" scheduler state (due = now).
create or replace function public.vocabulary_items_provision_srs_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vocabulary_srs_states (
    user_id, language_profile_id, vocabulary_item_id
  )
  values (new.user_id, new.language_profile_id, new.id)
  on conflict (vocabulary_item_id) do nothing;
  return new;
end;
$$;

drop trigger if exists vocabulary_items_provision_srs_state_trg
  on public.vocabulary_items;
create trigger vocabulary_items_provision_srs_state_trg
  after insert on public.vocabulary_items
  for each row execute function public.vocabulary_items_provision_srs_state();

-- Idempotent backfill for vocabulary that predates the scheduler.
insert into public.vocabulary_srs_states (
  user_id, language_profile_id, vocabulary_item_id
)
select vi.user_id, vi.language_profile_id, vi.id
from public.vocabulary_items vi
on conflict (vocabulary_item_id) do nothing;

-- Atomic review persistence: the single scheduler write path. Security definer,
-- verifies ownership, enforces optimistic concurrency, updates scheduler state
-- and appends the immutable review_event in one transaction.
create or replace function public.record_review(
  p_session_id        uuid,
  p_vocabulary_item_id uuid,
  p_rating            smallint,
  p_expected_version  integer,
  p_resulting_state   jsonb,
  p_response_time_ms  integer default null,
  p_exercise_mode     text default 'flashcard',
  p_affected_schedule boolean default true,
  p_reviewed_at       timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_state          public.vocabulary_srs_states%rowtype;
  v_session_status text;
  v_session_profile uuid;
  v_previous_state jsonb;
  v_new_version    integer;
  v_resulting_due  timestamptz;
  v_event_id       uuid;
begin
  if v_uid is null then
    raise exception 'LUCE_NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 4 then
    raise exception 'LUCE_INVALID_RATING' using errcode = '22023';
  end if;

  select * into v_state
  from public.vocabulary_srs_states s
  where s.vocabulary_item_id = p_vocabulary_item_id
    and s.user_id = v_uid
  for update;

  if not found then
    raise exception 'LUCE_STATE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select status, language_profile_id
    into v_session_status, v_session_profile
  from public.study_sessions ss
  where ss.id = p_session_id
    and ss.user_id = v_uid;

  if not found then
    raise exception 'LUCE_SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_session_profile <> v_state.language_profile_id then
    raise exception 'LUCE_SESSION_PROFILE_MISMATCH' using errcode = '42501';
  end if;

  if v_session_status <> 'active' then
    raise exception 'LUCE_SESSION_NOT_ACTIVE' using errcode = '22023';
  end if;

  if v_state.row_version <> p_expected_version then
    raise exception 'LUCE_STALE_VERSION' using errcode = '40001';
  end if;

  v_previous_state := jsonb_build_object(
    'due', v_state.due,
    'stability', v_state.stability,
    'difficulty', v_state.difficulty,
    'elapsed_days', v_state.elapsed_days,
    'scheduled_days', v_state.scheduled_days,
    'learning_steps', v_state.learning_steps,
    'reps', v_state.reps,
    'lapses', v_state.lapses,
    'state', v_state.state,
    'last_review', v_state.last_review
  );

  if p_affected_schedule then
    update public.vocabulary_srs_states s
    set due            = (p_resulting_state->>'due')::timestamptz,
        stability      = (p_resulting_state->>'stability')::double precision,
        difficulty     = (p_resulting_state->>'difficulty')::double precision,
        elapsed_days   = (p_resulting_state->>'elapsed_days')::integer,
        scheduled_days = (p_resulting_state->>'scheduled_days')::integer,
        learning_steps = coalesce((p_resulting_state->>'learning_steps')::integer, 0),
        reps           = (p_resulting_state->>'reps')::integer,
        lapses         = (p_resulting_state->>'lapses')::integer,
        state          = (p_resulting_state->>'state')::smallint,
        last_review    = nullif(p_resulting_state->>'last_review', '')::timestamptz,
        row_version    = s.row_version + 1
    where s.id = v_state.id
    returning s.row_version, s.due into v_new_version, v_resulting_due;
  else
    v_new_version := v_state.row_version;
    v_resulting_due := v_state.due;
  end if;

  insert into public.review_events (
    user_id, language_profile_id, study_session_id, vocabulary_item_id,
    rating, exercise_mode, affected_schedule, response_time_ms, reviewed_at,
    scheduler, scheduler_version,
    previous_state, resulting_state,
    previous_card_state, resulting_card_state,
    previous_due, resulting_due, scheduled_days
  )
  values (
    v_uid, v_state.language_profile_id, p_session_id, p_vocabulary_item_id,
    p_rating, coalesce(p_exercise_mode, 'flashcard'), p_affected_schedule,
    p_response_time_ms, p_reviewed_at,
    v_state.scheduler, v_state.scheduler_version,
    v_previous_state,
    case when p_affected_schedule then p_resulting_state else v_previous_state end,
    v_state.state,
    case
      when p_affected_schedule then (p_resulting_state->>'state')::smallint
      else v_state.state
    end,
    v_state.due,
    v_resulting_due,
    case
      when p_affected_schedule then (p_resulting_state->>'scheduled_days')::integer
      else v_state.scheduled_days
    end
  )
  returning id into v_event_id;

  return jsonb_build_object(
    'event_id', v_event_id,
    'row_version', v_new_version,
    'due', v_resulting_due,
    'affected_schedule', p_affected_schedule
  );
end;
$$;

revoke all on function public.record_review(
  uuid, uuid, smallint, integer, jsonb, integer, text, boolean, timestamptz
) from public;
grant execute on function public.record_review(
  uuid, uuid, smallint, integer, jsonb, integer, text, boolean, timestamptz
) to authenticated;

alter table public.vocabulary_srs_states enable row level security;
alter table public.study_sessions enable row level security;
alter table public.review_events enable row level security;

drop policy if exists "users can view own srs states"
  on public.vocabulary_srs_states;
create policy "users can view own srs states"
  on public.vocabulary_srs_states
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can view own study sessions"
  on public.study_sessions;
create policy "users can view own study sessions"
  on public.study_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can create sessions in own active language profiles"
  on public.study_sessions;
create policy "users can create sessions in own active language profiles"
  on public.study_sessions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.language_profiles profile
      where profile.id = language_profile_id
        and profile.user_id = auth.uid()
        and profile.archived_at is null
    )
  );

drop policy if exists "users can update own study sessions"
  on public.study_sessions;
create policy "users can update own study sessions"
  on public.study_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can view own review events"
  on public.review_events;
create policy "users can view own review events"
  on public.review_events
  for select
  using (auth.uid() = user_id);

-- ── Language ↔ Notes integration ───────────────────────────────────────────
-- See supabase/migrations/0005_language_notes.sql. These tables contain only
-- relationship metadata; all Note content remains in the existing notes table.

create table if not exists public.language_note_links (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  language_profile_id uuid not null,
  note_id             uuid not null,
  created_at          timestamptz not null default now(),

  constraint language_note_links_owner_key
    unique (id, user_id, language_profile_id),
  constraint language_note_links_profile_note_unique
    unique (user_id, language_profile_id, note_id),
  constraint language_note_links_profile_owner_fk
    foreign key (language_profile_id, user_id)
    references public.language_profiles (id, user_id)
    on delete cascade,
  constraint language_note_links_note_owner_fk
    foreign key (note_id, user_id)
    references public.notes (id, user_id)
    on delete cascade
);

create index if not exists language_note_links_profile_created_idx
  on public.language_note_links (
    user_id,
    language_profile_id,
    created_at desc
  );

create index if not exists language_note_links_note_lookup_idx
  on public.language_note_links (user_id, note_id, created_at desc);

create table if not exists public.language_note_topics (
  user_id               uuid not null references auth.users (id) on delete cascade,
  language_profile_id   uuid not null,
  language_note_link_id uuid not null,
  language_topic_id     uuid not null,
  created_at            timestamptz not null default now(),

  constraint language_note_topics_pkey
    primary key (language_note_link_id, language_topic_id),
  constraint language_note_topics_link_owner_profile_fk
    foreign key (language_note_link_id, user_id, language_profile_id)
    references public.language_note_links (id, user_id, language_profile_id)
    on delete cascade,
  constraint language_note_topics_topic_owner_profile_fk
    foreign key (language_topic_id, user_id, language_profile_id)
    references public.language_topics (id, user_id, language_profile_id)
    on delete cascade
);

create index if not exists language_note_topics_topic_lookup_idx
  on public.language_note_topics (
    user_id,
    language_profile_id,
    language_topic_id,
    language_note_link_id
  );

alter table public.language_note_links enable row level security;
alter table public.language_note_topics enable row level security;

drop policy if exists "users can view own language note links"
  on public.language_note_links;
create policy "users can view own language note links"
  on public.language_note_links
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can link own notes to own active language profiles"
  on public.language_note_links;
create policy "users can link own notes to own active language profiles"
  on public.language_note_links
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.language_profiles profile
      where profile.id = language_note_links.language_profile_id
        and profile.user_id = auth.uid()
        and profile.archived_at is null
    )
    and exists (
      select 1
      from public.notes note
      where note.id = language_note_links.note_id
        and note.user_id = auth.uid()
    )
  );

drop policy if exists "users can unlink own notes from languages"
  on public.language_note_links;
create policy "users can unlink own notes from languages"
  on public.language_note_links
  for delete
  using (auth.uid() = user_id);

drop policy if exists "users can view own language note topics"
  on public.language_note_topics;
create policy "users can view own language note topics"
  on public.language_note_topics
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can assign own language note topics"
  on public.language_note_topics;
create policy "users can assign own language note topics"
  on public.language_note_topics
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.language_note_links link
      join public.language_profiles profile
        on profile.id = link.language_profile_id
       and profile.user_id = link.user_id
      where link.id = language_note_topics.language_note_link_id
        and link.user_id = auth.uid()
        and link.language_profile_id = language_note_topics.language_profile_id
        and profile.archived_at is null
    )
    and exists (
      select 1
      from public.language_topics topic
      where topic.id = language_note_topics.language_topic_id
        and topic.user_id = auth.uid()
        and topic.language_profile_id = language_note_topics.language_profile_id
    )
  );

drop policy if exists "users can remove own language note topics"
  on public.language_note_topics;
create policy "users can remove own language note topics"
  on public.language_note_topics
  for delete
  using (auth.uid() = user_id);

-- ── Private Note image assets (see 0006_note_assets_storage.sql) ────────────
-- BlockNote stores only a private Storage object path in Note JSON. Actual
-- image bytes live in a private, type- and size-restricted Storage bucket.
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

-- Intentionally no UPDATE or DELETE policy: uploads never overwrite, and
-- automatic orphan cleanup is outside this checkpoint.
