import type { createClient } from "@/lib/supabase/server";
import type { ReviewAttempt } from "./summary";
import type { ReviewRating } from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Upper bound on cards pulled into a single review session. */
export const MAX_REVIEW_SESSION_SIZE = 200;

/** A due card: vocabulary content plus the scheduler version needed to grade. */
export interface DueReviewCard {
  vocabularyItemId: string;
  rowVersion: number;
  term: string;
  translation: string;
  definition: string | null;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
}

export interface ReviewSessionRow {
  id: string;
  language_profile_id: string;
  session_kind: string;
  exercise_mode: string;
  launch_source: string | null;
  status: "active" | "completed" | "abandoned";
  initial_item_count: number;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

// Cards are due when their scheduler `due` is in the past AND the underlying
// vocabulary is still active. Archived vocabulary can never surface here because
// the inner join filters on archived_at IS NULL.
const DUE_SELECT =
  "vocabulary_item_id, row_version, due, vocabulary_items!vocabulary_srs_states_item_owner_fk!inner(term, translation, definition, part_of_speech, example_sentence, example_translation)";

type DueRow = {
  vocabulary_item_id: string;
  row_version: number;
  vocabulary_items: {
    term: string;
    translation: string;
    definition: string | null;
    part_of_speech: string | null;
    example_sentence: string | null;
    example_translation: string | null;
  } | null;
};

/** Count active vocabulary currently due for review in a profile. */
export async function countDueReviewCards(
  supabase: ServerClient,
  userId: string,
  profileId: string,
  now: Date = new Date(),
): Promise<number> {
  const { count, error } = await supabase
    .from("vocabulary_srs_states")
    .select(
      "vocabulary_item_id, vocabulary_items!vocabulary_srs_states_item_owner_fk!inner(archived_at)",
      { count: "exact", head: true },
    )
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .lte("due", now.toISOString())
    .is("vocabulary_items.archived_at", null);

  if (error) {
    console.error("Could not count due review cards:", error);
    return 0;
  }
  return count ?? 0;
}

/** Load the due queue for a profile, ordered by due date (most overdue first). */
export async function loadDueReviewCards(
  supabase: ServerClient,
  userId: string,
  profileId: string,
  now: Date = new Date(),
): Promise<DueReviewCard[]> {
  const { data, error } = await supabase
    .from("vocabulary_srs_states")
    .select(DUE_SELECT)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .lte("due", now.toISOString())
    .is("vocabulary_items.archived_at", null)
    .order("due", { ascending: true })
    .limit(MAX_REVIEW_SESSION_SIZE);

  if (error) {
    console.error("Could not load due review cards:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as DueRow[];
  return rows
    .filter((row): row is DueRow & { vocabulary_items: NonNullable<DueRow["vocabulary_items"]> } =>
      Boolean(row.vocabulary_items),
    )
    .map((row) => ({
      vocabularyItemId: row.vocabulary_item_id,
      rowVersion: row.row_version,
      term: row.vocabulary_items.term,
      translation: row.vocabulary_items.translation,
      definition: row.vocabulary_items.definition,
      partOfSpeech: row.vocabulary_items.part_of_speech,
      exampleSentence: row.vocabulary_items.example_sentence,
      exampleTranslation: row.vocabulary_items.example_translation,
    }));
}

/** Load a single study session owned by the user, scoped to the profile. */
export async function loadReviewSession(
  supabase: ServerClient,
  userId: string,
  profileId: string,
  sessionId: string,
): Promise<ReviewSessionRow | null> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select(
      "id, language_profile_id, session_kind, exercise_mode, launch_source, status, initial_item_count, duration_ms, started_at, completed_at",
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("Could not load study session:", error);
    return null;
  }
  return (data as ReviewSessionRow | null) ?? null;
}

/** The most recent still-active review session for a profile, if any. */
export async function loadActiveReviewSession(
  supabase: ServerClient,
  userId: string,
  profileId: string,
): Promise<ReviewSessionRow | null> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select(
      "id, language_profile_id, session_kind, exercise_mode, launch_source, status, initial_item_count, duration_ms, started_at, completed_at",
    )
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Could not load active study session:", error);
    return null;
  }
  return (data as ReviewSessionRow | null) ?? null;
}

/**
 * Every graded attempt recorded for a session, oldest first. Used to seed the
 * summary (so metrics survive a refresh) and to render completed sessions.
 */
export async function loadSessionAttempts(
  supabase: ServerClient,
  userId: string,
  sessionId: string,
): Promise<ReviewAttempt[]> {
  const { data, error } = await supabase
    .from("review_events")
    .select("vocabulary_item_id, rating")
    .eq("user_id", userId)
    .eq("study_session_id", sessionId)
    .order("reviewed_at", { ascending: true });

  if (error) {
    console.error("Could not load session attempts:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    itemId: row.vocabulary_item_id as string,
    rating: row.rating as ReviewRating,
  }));
}
