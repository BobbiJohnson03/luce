import Link from "next/link";
import { TopicDetailClient } from "@/components/languages/TopicDetailClient";
import {
  LANGUAGE_TOPIC_COLUMNS,
  loadLanguageProfile,
  VOCABULARY_ITEM_COLUMNS,
} from "@/lib/languages/server";
import type {
  LanguageNoteCandidate,
  LanguageTopic,
  VocabularyItem,
} from "@/lib/languages/types";
import { getI18n } from "@/lib/i18n/server";

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
  const { t } = await getI18n();
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
        <p className="text-xs tracking-[0.25em] text-muted">
          {t("topics.singularLabel")}
        </p>
        <h2 className="mt-4 text-2xl font-light">
          {t("topics.detailUnavailable")}
        </h2>
        <p className="mt-3 text-sm text-muted">{t("common.tryAgain")}</p>
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className="py-12">
        <p className="text-xs tracking-[0.25em] text-muted">
          {t("topics.singularLabel")}
        </p>
        <h2 className="mt-4 text-2xl font-light">
          {t("topics.itemUnavailable")}
        </h2>
        <Link
          href={`/languages/${profileId}/topics`}
          className="mt-5 inline-block text-sm text-muted transition-colors hover:text-foreground"
        >
          {t("topics.back")}
        </Link>
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const selectColumns = `${VOCABULARY_ITEM_COLUMNS}, vocabulary_topics!vocabulary_topics_vocabulary_owner_profile_fk!inner(language_topic_id)`;
  const [vocabularyResult, noteTopicResult] = await Promise.all([
    supabase
      .from("vocabulary_items")
      .select(selectColumns, { count: "exact" })
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .is("archived_at", null)
      .eq("vocabulary_topics.language_topic_id", topicId)
      .order("term", { ascending: true })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("language_note_topics")
      .select("language_note_link_id, created_at", { count: "exact" })
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .eq("language_topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const {
    data: vocabularyData,
    error: vocabularyError,
    count: vocabularyCount,
  } = vocabularyResult;

  if (vocabularyError) {
    console.error("Could not load topic vocabulary:", vocabularyError);
  }

  if (noteTopicResult.error) {
    console.error("Could not load topic Notes:", noteTopicResult.error);
  }

  const noteLinkIds = (noteTopicResult.data ?? []).map(
    (assignment) => assignment.language_note_link_id,
  );
  const noteLinkResult =
    noteLinkIds.length > 0
      ? await supabase
          .from("language_note_links")
          .select("id, note_id")
          .eq("user_id", userId)
          .eq("language_profile_id", profileId)
          .in("id", noteLinkIds)
      : { data: [], error: null };

  if (noteLinkResult.error) {
    console.error("Could not load Topic Note links:", noteLinkResult.error);
  }

  const noteIdByLinkId = new Map(
    (noteLinkResult.data ?? []).map((link) => [link.id, link.note_id]),
  );
  const noteIds = noteLinkIds.flatMap((linkId) => {
    const noteId = noteIdByLinkId.get(linkId);
    return noteId ? [noteId] : [];
  });
  const noteResult =
    noteIds.length > 0
      ? await supabase
          .from("notes")
          .select("id, folder_id, title, is_pinned, position, updated_at")
          .eq("user_id", userId)
          .in("id", noteIds)
      : { data: [], error: null };

  if (noteResult.error) {
    console.error("Could not load Topic Notes:", noteResult.error);
  }

  const noteById = new Map(
    ((noteResult.data as LanguageNoteCandidate[] | null) ?? []).map((note) => [
      note.id,
      note,
    ]),
  );
  const linkedNotes = noteIds.flatMap((noteId) => {
    const note = noteById.get(noteId);
    return note ? [note] : [];
  });

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
      vocabularyCount={vocabularyError ? 0 : (vocabularyCount ?? 0)}
      linkedNotes={noteResult.error ? [] : linkedNotes}
      linkedNoteCount={noteTopicResult.error ? 0 : (noteTopicResult.count ?? 0)}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
