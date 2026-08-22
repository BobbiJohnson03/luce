import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LanguageProfile } from "./types";

export const LANGUAGE_PROFILE_COLUMNS =
  "id, user_id, language_code, language_name, translation_language_code, translation_language_name, current_cefr, target_cefr, daily_goal_minutes, position, archived_at, created_at, updated_at";

export const LANGUAGE_TOPIC_COLUMNS =
  "id, user_id, language_profile_id, parent_id, name, description, position, created_at, updated_at";

export const VOCABULARY_ITEM_COLUMNS =
  "id, user_id, language_profile_id, term, translation, definition, part_of_speech, gender, plural, pronunciation, ipa, example_sentence, example_translation, notes, archived_at, created_at, updated_at";

/** Authenticated, active profile context shared by protected language routes. */
export async function loadLanguageProfile(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("language_profiles")
    .select(LANGUAGE_PROFILE_COLUMNS)
    .eq("id", profileId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) console.error("Could not load language profile:", error);

  return {
    supabase,
    userId: user.id,
    profile: error || !data ? null : (data as LanguageProfile),
  };
}
