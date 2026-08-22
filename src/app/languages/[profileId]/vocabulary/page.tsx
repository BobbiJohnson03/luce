import { VocabularyPageClient } from "@/components/languages/VocabularyPageClient";
import {
  LANGUAGE_TOPIC_COLUMNS,
  loadLanguageProfile,
  VOCABULARY_ITEM_COLUMNS,
} from "@/lib/languages/server";
import type {
  LanguageTopic,
  VocabularyItem,
  VocabularyItemWithTopics,
} from "@/lib/languages/types";

const PAGE_SIZE = 50;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function VocabularyPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profileId } = await params;
  const filters = await searchParams;
  const query = firstParam(filters.q).trim().slice(0, 200);
  const requestedTopicId = firstParam(filters.topic);
  const pageRaw = Number.parseInt(firstParam(filters.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const { data: topicData, error: topicError } = await supabase
    .from("language_topics")
    .select(LANGUAGE_TOPIC_COLUMNS)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (topicError) console.error("Could not load vocabulary topics:", topicError);
  const topics = (topicData as LanguageTopic[] | null) ?? [];
  const selectedTopicId = topics.some((topic) => topic.id === requestedTopicId)
    ? requestedTopicId
    : "";

  const selectColumns = selectedTopicId
    ? `${VOCABULARY_ITEM_COLUMNS}, vocabulary_topics!vocabulary_topics_vocabulary_owner_profile_fk!inner(language_topic_id)`
    : VOCABULARY_ITEM_COLUMNS;

  let vocabularyQuery = supabase
    .from("vocabulary_items")
    .select(selectColumns, { count: "exact" })
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .is("archived_at", null);

  if (selectedTopicId) {
    vocabularyQuery = vocabularyQuery.eq(
      "vocabulary_topics.language_topic_id",
      selectedTopicId,
    );
  }
  if (query) {
    const safe = query.replace(/["\\]/g, (match) => `\\${match}`);
    const pattern = `"%${safe}%"`;
    vocabularyQuery = vocabularyQuery.or(
      `term.ilike.${pattern},translation.ilike.${pattern}`,
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await vocabularyQuery
    .order("term", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error("Could not load vocabulary:", error);
    return (
      <div className="py-12">
        <p className="text-xs tracking-[0.25em] text-muted">VOCABULARY</p>
        <h2 className="mt-4 text-2xl font-light">Vocabulary is unavailable.</h2>
        <p className="mt-3 text-sm text-muted">Please refresh and try again.</p>
      </div>
    );
  }

  const rawItems = (data ?? []) as unknown as VocabularyItem[];
  const topicIdsByItem = new Map<string, string[]>();
  if (rawItems.length > 0) {
    const { data: relationData, error: relationError } = await supabase
      .from("vocabulary_topics")
      .select("vocabulary_item_id, language_topic_id")
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .in(
        "vocabulary_item_id",
        rawItems.map((item) => item.id),
      );
    if (relationError) {
      console.error("Could not load vocabulary topic assignments:", relationError);
    } else {
      for (const relation of relationData) {
        const assigned = topicIdsByItem.get(relation.vocabulary_item_id) ?? [];
        assigned.push(relation.language_topic_id);
        topicIdsByItem.set(relation.vocabulary_item_id, assigned);
      }
    }
  }

  const items: VocabularyItemWithTopics[] = rawItems.map((item) => ({
    ...item,
    topic_ids: topicIdsByItem.get(item.id) ?? [],
  }));

  return (
    <VocabularyPageClient
      profileId={profileId}
      items={items}
      topics={topics}
      total={count ?? 0}
      query={query}
      selectedTopicId={selectedTopicId}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
