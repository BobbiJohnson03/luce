/** CEFR proficiency levels accepted by the language_profiles table. */
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

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
