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
