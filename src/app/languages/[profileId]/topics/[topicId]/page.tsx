import Link from "next/link";
import { TopicDetailClient } from "@/components/languages/TopicDetailClient";
import {
  LANGUAGE_TOPIC_COLUMNS,
  loadLanguageProfile,
  VOCABULARY_ITEM_COLUMNS,
} from "@/lib/languages/server";
import type { LanguageTopic, VocabularyItem } from "@/lib/languages/types";

const PAGE_SIZE = 50;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string; topicId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profileId, topicId } = await params;
  const filters = await searchParams;
  const pageRaw = Number.parseInt(firstParam(filters.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const [{ data: topicData, error: topicError }, { data: allTopicData, error: allTopicError }] =
    await Promise.all([
      supabase
        .from("language_topics")
        .select(LANGUAGE_TOPIC_COLUMNS)
        .eq("id", topicId)
        .eq("user_id", userId)
        .eq("language_profile_id", profileId)
        .maybeSingle(),
      supabase
        .from("language_topics")
        .select(LANGUAGE_TOPIC_COLUMNS)
        .eq("user_id", userId)
        .eq("language_profile_id", profileId)
        .order("position", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  if (topicError || allTopicError) {
    console.error("Could not load topic details:", {
      topic: topicError,
      topics: allTopicError,
    });
    return (
      <div className="py-12">
        <p className="text-xs tracking-[0.25em] text-muted">TOPIC</p>
        <h2 className="mt-4 text-2xl font-light">Topic details are unavailable.</h2>
        <p className="mt-3 text-sm text-muted">Please refresh and try again.</p>
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className="py-12">
        <p className="text-xs tracking-[0.25em] text-muted">TOPIC</p>
        <h2 className="mt-4 text-2xl font-light">This topic is unavailable.</h2>
        <Link
          href={`/languages/${profileId}/topics`}
          className="mt-5 inline-block text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to Topics
        </Link>
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const selectColumns = `${VOCABULARY_ITEM_COLUMNS}, vocabulary_topics!vocabulary_topics_vocabulary_owner_profile_fk!inner(language_topic_id)`;
  const { data: vocabularyData, error: vocabularyError, count } = await supabase
    .from("vocabulary_items")
    .select(selectColumns, { count: "exact" })
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .is("archived_at", null)
    .eq("vocabulary_topics.language_topic_id", topicId)
    .order("term", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (vocabularyError) {
    console.error("Could not load topic vocabulary:", vocabularyError);
  }

  return (
    <TopicDetailClient
      profileId={profileId}
      topic={topicData as LanguageTopic}
      topics={(allTopicData as LanguageTopic[] | null) ?? []}
      vocabulary={
        vocabularyError
          ? []
          : ((vocabularyData ?? []) as unknown as VocabularyItem[])
      }
      vocabularyCount={vocabularyError ? 0 : (count ?? 0)}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
