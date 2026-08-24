import type { createClient } from "@/lib/supabase/server";
import { MAX_PRACTICE_SESSION_SIZE } from "./practice";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Vocabulary content needed to render a practice card (either direction). */
export interface PracticeCardContent {
  vocabularyItemId: string;
  term: string;
  translation: string;
  definition: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
}

const CARD_SELECT =
  "id, term, translation, definition, example_sentence, example_translation";

/**
 * Ordered ids of ACTIVE vocabulary eligible for practice, newest first. When a
 * topic is given, only vocabulary assigned to that topic is returned (each item
 * once). Archived vocabulary is always excluded.
 */
export async function loadActiveVocabularyIds(
  supabase: ServerClient,
  userId: string,
  profileId: string,
  topicId?: string | null,
): Promise<string[]> {
  if (topicId) {
    const { data, error } = await supabase
      .from("vocabulary_items")
      .select(
        "id, vocabulary_topics!vocabulary_topics_vocabulary_owner_profile_fk!inner(language_topic_id)",
      )
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .is("archived_at", null)
      .eq("vocabulary_topics.language_topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(MAX_PRACTICE_SESSION_SIZE);
    if (error) {
      console.error("Could not load topic vocabulary for practice:", error);
      return [];
    }
    return (data ?? []).map((row) => row.id as string);
  }

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("id")
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_PRACTICE_SESSION_SIZE);
  if (error) {
    console.error("Could not load vocabulary for practice:", error);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

/** Count of active vocabulary in a profile (optionally within a topic). */
export async function countActiveVocabulary(
  supabase: ServerClient,
  userId: string,
  profileId: string,
  topicId?: string | null,
): Promise<number> {
  let query = supabase
    .from("vocabulary_items")
    .select(
      topicId
        ? "id, vocabulary_topics!vocabulary_topics_vocabulary_owner_profile_fk!inner(language_topic_id)"
        : "id",
      { count: "exact", head: true },
    )
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .is("archived_at", null);
  if (topicId) {
    query = query.eq("vocabulary_topics.language_topic_id", topicId);
  }
  const { count, error } = await query;
  if (error) {
    console.error("Could not count active vocabulary:", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Resolve content for the given item ids (active only). Items missing here
 * (e.g. archived after the plan was created) are simply absent from the map and
 * are safely skipped by the runner.
 */
export async function loadPracticeCards(
  supabase: ServerClient,
  userId: string,
  profileId: string,
  itemIds: string[],
): Promise<Map<string, PracticeCardContent>> {
  const cards = new Map<string, PracticeCardContent>();
  if (itemIds.length === 0) return cards;

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select(CARD_SELECT)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .is("archived_at", null)
    .in("id", itemIds);
  if (error) {
    console.error("Could not load practice cards:", error);
    return cards;
  }

  for (const row of data ?? []) {
    cards.set(row.id as string, {
      vocabularyItemId: row.id as string,
      term: row.term as string,
      translation: row.translation as string,
      definition: (row.definition as string | null) ?? null,
      exampleSentence: (row.example_sentence as string | null) ?? null,
      exampleTranslation: (row.example_translation as string | null) ?? null,
    });
  }
  return cards;
}
