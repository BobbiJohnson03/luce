import { PracticeSetupClient } from "@/components/languages/PracticeSetupClient";
import {
  LANGUAGE_TOPIC_COLUMNS,
  loadLanguageProfile,
} from "@/lib/languages/server";
import type { LanguageTopic } from "@/lib/languages/types";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PracticeSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profileId } = await params;
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const initialTopicId = firstParam((await searchParams).topic) || null;

  const { data: topicData, error } = await supabase
    .from("language_topics")
    .select(LANGUAGE_TOPIC_COLUMNS)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) console.error("Could not load topics for practice:", error);
  const topics = (topicData as LanguageTopic[] | null) ?? [];

  return (
    <PracticeSetupClient
      profileId={profileId}
      topics={topics}
      initialTopicId={initialTopicId}
    />
  );
}
