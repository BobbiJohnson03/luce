/** CEFR proficiency levels accepted by the language_profiles table. */
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/**
 * A user-owned language workspace. Mirrors the snake_case columns stored in
 * Supabase; timestamps are returned by PostgREST as ISO strings.
 */
export type LanguageProfile = {
  id: string;
  user_id: string;
  language_code: string;
  language_name: string;
  translation_language_code: string;
  translation_language_name: string;
  current_cefr: CefrLevel | null;
  target_cefr: CefrLevel | null;
  daily_goal_minutes: number | null;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

/** A semantic category within one language profile. */
export type LanguageTopic = {
  id: string;
  user_id: string;
  language_profile_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

/** Durable vocabulary content. Review and scheduling state are separate. */
export type VocabularyItem = {
  id: string;
  user_id: string;
  language_profile_id: string;
  term: string;
  translation: string;
  definition: string | null;
  part_of_speech: string | null;
  gender: string | null;
  plural: string | null;
  pronunciation: string | null;
  ipa: string | null;
  example_sentence: string | null;
  example_translation: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VocabularyTopic = {
  user_id: string;
  language_profile_id: string;
  vocabulary_item_id: string;
  language_topic_id: string;
  created_at: string;
};

export type VocabularyItemWithTopics = VocabularyItem & {
  topic_ids: string[];
};
