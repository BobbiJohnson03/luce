-- Luce — Language Profile foundation
-- Adds one user-owned profile per actively studied BCP 47 language code.

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

-- Archived profiles do not prevent a user from starting the language again.
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

-- BCP 47 tags are case-insensitive. Store a stable lowercase, trimmed form so
-- uniqueness and future lookups behave consistently without a new dependency.
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

drop trigger if exists language_profiles_set_updated_at on public.language_profiles;
create trigger language_profiles_set_updated_at
  before update on public.language_profiles
  for each row execute function public.luce_set_updated_at();
