# Luce — A Minimalist Personal Command Center

_luce_ (Italian) — **light.** A calm, dark-mode-only web app that acts as your personal **command center**: a calendar for the things that matter, to-do lists with a satisfying check-off sound, a hierarchical notes & knowledge workspace, and room for an interactive 3D centerpiece. Everything important, in one quiet place.

---

## Visuals

> The gallery below will be filled with screenshots and a short demo GIF once they are captured.
>
> Suggested shots:
> 1. Landing / hero with the glowing centerpiece
> 2. Login & register screens
> 3. Dashboard with the calendar panel
> 4. To-do list with a checked-off task
> 5. Notes workspace: folder tree + a note with a table and checklist

---

## Why this project exists

Notes, reminders and to-dos usually end up scattered across sticky notes, phone apps and half-forgotten documents. Luce brings them together into a single, deliberately minimal space that is calm to look at and quick to use.

The design principles are simple:

- **Dark by design.** One theme, tuned for low-light focus — no theme toggle, no distraction.
- **Minimal surface, maximum whitespace.** Only what matters is on screen.
- **Small moments of delight.** A soft sound when you check something off; a gentle glow in the background.
- **Yours only.** Data is scoped per user with row-level security, so you see only your own calendar, tasks and notes.

---

## Core features

| Feature | Description |
|---------|-------------|
| Authentication | Email + password sign-up and login via Supabase, with a session-refreshing proxy that guards private routes. |
| Dashboard | A single command center with a centered, full-screen menu-overlay navigation and an ambient light backdrop. |
| Calendar | A Monday-first monthly calendar; click any day to add or remove events and notes. |
| To-do lists | Add, complete and delete tasks with optimistic UI and a live "remaining" count. |
| Notes & knowledge | Nested folders and a block-style editor (BlockNote): headings, lists, checklists, quotes, dividers, code blocks and tables. Autosave, pinning, breadcrumbs, move/rename/delete and full-text-ish search over titles and content. |
| Check-off sound | A confirmation sound plays when a task is checked, with a synthesized fallback until a custom audio file is added. |
| Graceful setup | If Supabase keys are missing, the app shows a friendly setup notice instead of crashing. |
| 3D-ready | A placeholder centerpiece is wired in, ready to be swapped for an interactive Spline scene. |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI / styling | Tailwind CSS v4 |
| Runtime | React 19 |
| Auth + database | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Notes editor | BlockNote (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`) |
| Sound | Web Audio API (with an audio-file fallback path) |
| 3D (planned) | Spline (`@splinetool/react-spline`) |

---

## Architecture

### High-level view

```mermaid
graph TD
    A[Browser<br/>Next.js client] -->|Server Actions| B[Next.js server]
    A -->|proxy: session refresh| P[Proxy / route guard]
    B --> C[Supabase Auth]
    B --> D[(Supabase Postgres<br/>events · todos · note_folders · notes, RLS)]
    P --> C
```

### Request flow (adding a task)

```mermaid
sequenceDiagram
    participant U as User (TodoList)
    participant S as Server Action
    participant Q as Supabase (Postgres + RLS)

    U->>S: addTodo(formData)
    S->>Q: insert todo (user_id = auth.uid())
    Q-->>S: ok
    S-->>U: revalidatePath("/dashboard")
    U->>U: optimistic UI + check-off sound
```

The app follows the **Next.js App Router** structure:

- `src/app/` — routes: landing (`page.tsx`), `login/`, `register/`, and the protected `dashboard/` and `notes/`.
- `src/app/auth/actions.ts` — server actions for login, register and sign-out.
- `src/app/dashboard/actions.ts` — server actions for events and todos.
- `src/app/notes/` — notes routes (`/notes`, `/notes/[id]`), server actions and the `api/notes/[id]` beacon endpoint used to flush autosaves on tab close.
- `src/components/` — UI building blocks (`Calendar`, `TodoList`, `MenuOverlay`, `AuthForm`, `BlobPlaceholder`, ...) plus `components/notes/` (sidebar tree, editor, dialogs, toasts, ...).
- `src/lib/supabase/` — browser and server Supabase clients plus the session-refresh helper.
- `src/lib/notes/` — framework-free, testable helpers: recursive tree building, cycle/descendant detection, breadcrumbs, and the editor-JSON → plain-text extractor used for search.
- `src/proxy.ts` — refreshes the session on every request and redirects unauthenticated users away from `/dashboard` and `/notes`.
- `supabase/schema.sql` — full database schema; `supabase/migrations/` holds incremental migrations.

### Notes: data & save flow

- Reads happen in server components; structural changes (create / rename / move / delete / pin) are server actions that `revalidatePath` the notes tree.
- Note **body** is a BlockNote JSONB document, autosaved with a debounce (~700 ms). Content saves intentionally skip revalidation to avoid re-fetching the tree on every keystroke; pending edits are flushed when switching notes (unmount) and on tab close (`navigator.sendBeacon`).
- A derived `search_text` column mirrors title + content as plain text, so search is a simple, index-friendly `ILIKE` that can later grow into Postgres full-text search.

---

## Data model

Four tables, all protected by row-level security so each user can only read and write their own rows (`auth.uid() = user_id`).

| Table | Columns | Purpose |
|-------|---------|---------|
| `events` | `id`, `user_id`, `event_date`, `title`, `note`, `created_at` | Calendar entries, one or more per day. |
| `todos` | `id`, `user_id`, `title`, `done`, `created_at` | To-do items with a completion flag. |
| `note_folders` | `id`, `user_id`, `name`, `parent_id`, `position`, `created_at`, `updated_at` | Recursively nested notes folders (`parent_id` self-reference; `null` = root). |
| `notes` | `id`, `user_id`, `folder_id`, `title`, `content` (jsonb), `search_text`, `is_pinned`, `position`, `created_at`, `updated_at` | Notes; `content` is the BlockNote document, `search_text` its plain-text projection. |

Integrity is enforced in the database, not just the UI: triggers reject a note assigned to another user's folder, a folder parented to another user's folder, self-parenting and circular hierarchies; deleting a folder cascades to its nested folders **and** their notes, so no rows are orphaned.

The full schema, including indexes, triggers and RLS policies, lives in [`supabase/schema.sql`](supabase/schema.sql).

---

## Getting started

### Prerequisites

- Node.js 20+ (tested on Node 22)
- npm
- A free [Supabase](https://supabase.com) project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in the keys from **Supabase → Project Settings → API**:

```bash
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Create the database

In the Supabase dashboard, open the **SQL Editor**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) and run it. This creates the
`events`, `todos`, `note_folders` and `notes` tables together with their RLS
policies, triggers and indexes.

> Already have an older Luce database (only `events` + `todos`)? Run the
> incremental [`supabase/migrations/0001_notes.sql`](supabase/migrations/0001_notes.sql)
> instead to add just the Notes tables.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account and you're in.

### Useful scripts

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # lint the project
```

---

## Project structure

```
luce/
├── src/
│   ├── app/
│   │   ├── page.tsx            # landing / hero
│   │   ├── login/              # login screen
│   │   ├── register/           # register screen
│   │   ├── auth/actions.ts     # login / register / sign-out actions
│   │   ├── dashboard/          # protected command center
│   │   │   ├── layout.tsx      # header, menu, auth guard
│   │   │   ├── page.tsx        # calendar + to-do panels
│   │   │   └── actions.ts      # event / todo server actions
│   │   ├── notes/              # protected notes workspace
│   │   │   ├── layout.tsx      # sidebar shell + auth guard
│   │   │   ├── page.tsx        # notes home (pinned / recent / folder view)
│   │   │   ├── [id]/page.tsx   # single-note editor screen
│   │   │   └── actions.ts      # folder / note server actions + search
│   │   └── api/notes/[id]/     # sendBeacon autosave-flush endpoint
│   ├── components/
│   │   ├── notes/              # sidebar, tree, editor, dialogs, toasts, ...
│   │   └── ...                 # Calendar, TodoList, MenuOverlay, Logo, ...
│   ├── lib/
│   │   ├── supabase/           # browser + server clients, session helper
│   │   ├── notes/              # tree/search helpers + shared types
│   │   ├── types.ts            # shared types
│   │   └── useCheckSound.ts    # check-off sound hook
│   └── proxy.ts                # session refresh + route guard
├── supabase/
│   ├── schema.sql              # full schema (tables, triggers, RLS)
│   └── migrations/             # incremental migrations (0001_notes.sql, ...)
├── public/sounds/              # drop check.mp3 here
└── README.md
```

---

## Roadmap

The project is built in stages. Stages 0–6 are complete.

- [x] **Stage 0 — Setup.** Next.js + TypeScript + Tailwind, git repo, README.
- [x] **Stage 1 — UI foundation.** Dark-mode-only design system, minimalist hero.
- [x] **Stage 2 — Auth.** Supabase login/register, protected dashboard, graceful setup notice.
- [x] **Stage 3 — Dashboard.** Menu-overlay navigation and ambient light backdrop.
- [x] **Stage 4 — Calendar.** DB schema with RLS, monthly calendar with per-day events.
- [x] **Stage 5 — To-do + sound.** Optimistic to-do lists with a check-off sound.
- [x] **Stage 6 — Notes & knowledge.** Nested folders, a BlockNote block editor (headings, lists, checklists, quotes, dividers, code, tables), autosave, pinning, breadcrumbs, move/rename/delete and search — all per-user with RLS.
- [ ] **Stage 7 — Spline 3D.** Replace the placeholder centerpiece with an interactive Spline scene.

### Future improvements

- Swap the `BlobPlaceholder` for a real Spline scene (`@splinetool/react-spline`).
- Add a custom `public/sounds/check.mp3` in place of the synthesized tick.
- Notes: templates, richer full-text search, and links between notes, tasks and calendar events.
- Recurring events and reminders.
- Drag-to-reorder for to-do items.
- CI for automated linting and builds.

---

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built by **BobbiJohnson03**. Visual inspiration from [junhyungpark.com](https://junhyungpark.com/).
