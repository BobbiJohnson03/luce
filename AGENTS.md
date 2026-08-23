# Luce — project notes for agents

## Verification commands

There is no `typecheck` npm script. Use:

```bash
npm run lint          # ESLint (flat config, next core-web-vitals + typescript)
npx tsc --noEmit      # TypeScript type check
npm run build         # Production build (Turbopack)
npm run test          # Vitest (unit tests for pure logic, e.g. src/lib/languages/srs)
npm run dev           # Dev server (http://localhost:3000)
```

Run lint, tsc, build (and test when logic changed) before considering a change done.

> npm note: this repo relies on npm auto-installing peer deps (e.g. `@mantine/core`
> for `@blocknote/mantine`). Do NOT install with `--legacy-peer-deps` — it prunes
> those peers and breaks the build. If `npm install <pkg>` hits a transient
> arborist `edgesOut` error, retry; a plain `npm install` reconciles the tree.

## Supabase

- Schema lives in `supabase/schema.sql` (canonical, re-runnable snapshot).
- Incremental migrations live in `supabase/migrations/` (e.g. `0001_notes.sql`).
- Apply SQL manually via Supabase Dashboard → SQL Editor (no Supabase CLI is set up).
- Every table uses RLS with `auth.uid() = user_id`. Keep that pattern for new tables.

## Conventions

- Next.js 16 App Router, React 19, TypeScript (strict), Tailwind v4 (theme tokens
  in `src/app/globals.css`, no tailwind config file).
- DB columns are snake_case; TS types mirror them (see `src/lib/types.ts`,
  `src/lib/notes/types.ts`).
- Data reads happen in server components; mutations are server actions in
  `src/app/**/actions.ts` using the `requireUser()` pattern + `revalidatePath`.
- The lint config enforces the React Hooks rules `react-hooks/refs` and
  `react-hooks/set-state-in-effect`: don't write refs or call setState during
  render/effects. To reset state on a prop change, adjust state during render
  with a "previous prop" state (see `NotesStore`/`RenameDialog`).

## Notes feature (src/lib/notes, src/components/notes, src/app/notes)

- Editor: BlockNote (`@blocknote/*`), loaded client-only via `next/dynamic`.
- Pure, testable logic: `src/lib/notes/tree.ts`, `src/lib/notes/search.ts`.
- Requires the `0001_notes.sql` migration to be applied before use.

## Languages review / SRS (src/lib/languages/srs, src/app/languages/[profileId]/review)

- Spaced repetition uses FSRS via the `ts-fsrs` package, isolated behind
  `src/lib/languages/srs/scheduler.ts`. Nothing else imports `ts-fsrs`.
- Pure, unit-tested logic: `scheduler.ts`, `queue.ts` (bounded Again requeue),
  `summary.ts`. See the `*.test.ts` files next to them.
- Authoritative FSRS transitions are computed server-side in the review server
  actions; the client only sends session/item/rating/response time.
- All scheduler writes go through the `record_review` Postgres RPC (atomic
  state update + immutable `review_events` insert, optimistic `row_version`).
- Requires the `0004_language_review_srs.sql` migration to be applied.
