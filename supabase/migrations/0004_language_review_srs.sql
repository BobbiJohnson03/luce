-- Luce — Language review & spaced repetition (FSRS)
-- Adds the scheduling state, study sessions, immutable review history, and the
-- single atomic mutation boundary that turns stored vocabulary into a spaced
-- repetition system.
--
-- Design invariants:
--   * Vocabulary content (vocabulary_items) stays free of scheduling state.
--     Scheduling lives only in vocabulary_srs_states (one row per item).
--   * Every vocabulary item gets exactly one scheduler state: existing rows are
--     backfilled here, future rows are provisioned by an AFTER INSERT trigger.
--   * Scheduler writes never happen from the client. They go through the
--     security-definer RPC public.record_review, which verifies ownership,
--     enforces optimistic concurrency (row_version) and atomically updates the
--     scheduler state while inserting the immutable review_event.
--   * Composite ownership foreign keys (id, user_id, language_profile_id) make
--     cross-user and cross-profile relationships impossible, matching Phase 3.

-- ── Scheduler state (one row per vocabulary item) ───────────────────────────
-- Mirrors the ts-fsrs Card shape. state: 0 New, 1 Learning, 2 Review,
-- 3 Relearning. Stability/difficulty are FSRS memory parameters. row_version is
-- the optimistic-concurrency guard against stale simultaneous tabs.
create table if not exists public.vocabulary_srs_states (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  language_profile_id uuid not null,
  vocabulary_item_id  uuid not null,

  -- FSRS card state
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

  -- Scheduler metadata + optimistic concurrency
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

-- Core "what is due" query: active vocabulary for a profile ordered by due.
create index if not exists vocabulary_srs_states_due_idx
  on public.vocabulary_srs_states (user_id, language_profile_id, due);

-- ── Study sessions (shared Review + future Practice engine) ──────────────────
-- session_kind is 'scheduled_review' in Phase 4; 'practice' is reserved for
-- Phase 5. exercise_mode/configuration keep the table forward-compatible.
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

-- ── Review events (immutable history) ───────────────────────────────────────
-- One row per graded attempt. rating: 1 Again, 2 Hard, 3 Good, 4 Easy.
-- affected_schedule is true for scheduled review; Phase 5 practice will insert
-- rows with affected_schedule = false so it never changes FSRS state.
-- previous_state/resulting_state are full JSON snapshots of the scheduler card;
-- the explicit columns support efficient history/analytics queries.
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

-- ── updated_at maintenance ──────────────────────────────────────────────────
drop trigger if exists vocabulary_srs_states_set_updated_at
  on public.vocabulary_srs_states;
create trigger vocabulary_srs_states_set_updated_at
  before update on public.vocabulary_srs_states
  for each row execute function public.luce_set_updated_at();

-- ── Scheduler-state provisioning ────────────────────────────────────────────
-- Every new vocabulary item gets a default "New" scheduler state (due = now),
-- so it enters the FSRS queue immediately without any manual repair. This keeps
-- content and scheduler state separated while guaranteeing a 1:1 relationship.
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

-- Backfill scheduler state for vocabulary that already exists (Phase 3 data).
-- Idempotent: rows that already have state are skipped. Every backfilled card
-- starts as New with due = now, so existing vocabulary becomes reviewable.
insert into public.vocabulary_srs_states (
  user_id, language_profile_id, vocabulary_item_id
)
select vi.user_id, vi.language_profile_id, vi.id
from public.vocabulary_items vi
on conflict (vocabulary_item_id) do nothing;

-- ── Atomic review persistence (the only scheduler write path) ────────────────
-- Runs as security definer so it can update scheduler state and append history
-- in one transaction while still enforcing ownership itself. It:
--   1. authenticates via auth.uid()
--   2. locks and reads the current scheduler state (FOR UPDATE)
--   3. verifies the item, session and profile all belong to the caller
--   4. enforces optimistic concurrency against p_expected_version
--   5. updates the scheduler state (only when p_affected_schedule)
--   6. inserts the immutable review_event with before/after snapshots
-- p_resulting_state is the FSRS card computed by trusted server-side code; this
-- function never trusts a client for ownership or for the current card state.
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

  -- Lock the scheduler state row for this item, scoped to the caller.
  select * into v_state
  from public.vocabulary_srs_states s
  where s.vocabulary_item_id = p_vocabulary_item_id
    and s.user_id = v_uid
  for update;

  if not found then
    raise exception 'LUCE_STATE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Verify the session belongs to the caller and to the same profile.
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

  -- Optimistic concurrency: a newer attempt (e.g. another tab) already advanced
  -- the card. Reject cleanly so the client can reload instead of overwriting.
  if v_state.row_version <> p_expected_version then
    raise exception 'LUCE_STALE_VERSION' using errcode = '40001';
  end if;

  -- Snapshot the authoritative current state (never trust a client snapshot).
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
    -- Practice (Phase 5): record the attempt but never touch scheduler state.
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

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.vocabulary_srs_states enable row level security;
alter table public.study_sessions enable row level security;
alter table public.review_events enable row level security;

-- Scheduler state: readable by its owner; all writes go through record_review
-- (security definer), so no client insert/update/delete policies exist.
drop policy if exists "users can view own srs states"
  on public.vocabulary_srs_states;
create policy "users can view own srs states"
  on public.vocabulary_srs_states
  for select
  using (auth.uid() = user_id);

-- Study sessions: owner may read, create (in an active profile) and update
-- (e.g. mark completed/abandoned). No deletes — history stays intact.
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

-- Review events: owner may read only. Inserts happen exclusively through
-- record_review; there are deliberately no insert/update/delete policies so the
-- history is immutable from the client's perspective.
drop policy if exists "users can view own review events"
  on public.review_events;
create policy "users can view own review events"
  on public.review_events
  for select
  using (auth.uid() = user_id);
