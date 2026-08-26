-- Luce — Language ↔ Notes integration
-- Links existing Luce Notes to language profiles and optionally to semantic
-- language topics. Note bodies remain exclusively in public.notes.

-- The existing notes primary key proves note identity. This additive composite
-- ownership index lets foreign keys also prove that the linked note and the
-- language metadata belong to the same user.
create unique index if not exists notes_id_user_idx
  on public.notes (id, user_id);

-- ── Existing Note ↔ Language Profile links ──────────────────────────────────
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

-- Profile listing and recent-link ordering. The unique constraint above also
-- supports exact duplicate checks for (user, profile, note).
create index if not exists language_note_links_profile_created_idx
  on public.language_note_links (
    user_id,
    language_profile_id,
    created_at desc
  );

-- Normal Notes can resolve all linked languages for one owned Note efficiently.
create index if not exists language_note_links_note_lookup_idx
  on public.language_note_links (user_id, note_id, created_at desc);

-- ── Language-specific Topic assignments for a linked Note ──────────────────
create table if not exists public.language_note_topics (
  user_id              uuid not null references auth.users (id) on delete cascade,
  language_profile_id  uuid not null,
  language_note_link_id uuid not null,
  language_topic_id    uuid not null,
  created_at           timestamptz not null default now(),

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

-- Topic detail pages can resolve linked Notes without scanning link-owned rows.
create index if not exists language_note_topics_topic_lookup_idx
  on public.language_note_topics (
    user_id,
    language_profile_id,
    language_topic_id,
    language_note_link_id
  );

-- ── Row Level Security ──────────────────────────────────────────────────────
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
