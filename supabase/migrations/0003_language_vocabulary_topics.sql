-- Luce — Language vocabulary and semantic topics
-- Adds durable vocabulary content, hierarchical topics, and many-to-many
-- associations. Scheduling and learning state intentionally live elsewhere.

-- Composite ownership keys let foreign keys prove that every child row belongs
-- to the same user as its language profile.
create unique index if not exists language_profiles_id_user_idx
  on public.language_profiles (id, user_id);

-- ── Semantic topics ─────────────────────────────────────────────────────────
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

-- PostgreSQL treats NULL values as distinct in ordinary unique indexes, so root
-- and nested sibling names use separate partial indexes.
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

-- ── Vocabulary content ──────────────────────────────────────────────────────
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

-- These functional indexes support case-insensitive prefix searches while the
-- profile index above still efficiently narrows contains-search candidates.
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

-- ── Vocabulary ↔ Topic associations ─────────────────────────────────────────
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

-- ── updated_at maintenance ──────────────────────────────────────────────────
drop trigger if exists language_topics_set_updated_at on public.language_topics;
create trigger language_topics_set_updated_at
  before update on public.language_topics
  for each row execute function public.luce_set_updated_at();

drop trigger if exists vocabulary_items_set_updated_at on public.vocabulary_items;
create trigger vocabulary_items_set_updated_at
  before update on public.vocabulary_items
  for each row execute function public.luce_set_updated_at();

-- ── Topic hierarchy integrity ───────────────────────────────────────────────
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

-- ── Row Level Security ──────────────────────────────────────────────────────
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
