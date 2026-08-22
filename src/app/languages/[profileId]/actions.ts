"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LanguageContentActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

type AuthenticatedClient = Awaited<ReturnType<typeof createClient>>;

type VocabularyInput = {
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
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

async function hasActiveProfile(
  supabase: AuthenticatedClient,
  userId: string,
  profileId: string,
) {
  if (!UUID_PATTERN.test(profileId)) return false;
  const { data, error } = await supabase
    .from("language_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function optionalText(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function readVocabulary(
  formData: FormData,
): { ok: true; data: VocabularyInput } | { ok: false; error: string } {
  const term = String(formData.get("term") ?? "").trim();
  const translation = String(formData.get("translation") ?? "").trim();

  if (!term) return { ok: false, error: "Term is required." };
  if (!translation) return { ok: false, error: "Translation is required." };
  if (term.length > 300 || translation.length > 500) {
    return { ok: false, error: "Term or translation is too long." };
  }

  return {
    ok: true,
    data: {
      term,
      translation,
      definition: optionalText(formData, "definition", 4000),
      part_of_speech: optionalText(formData, "part_of_speech", 120),
      gender: optionalText(formData, "gender", 120),
      plural: optionalText(formData, "plural", 300),
      pronunciation: optionalText(formData, "pronunciation", 500),
      ipa: optionalText(formData, "ipa", 500),
      example_sentence: optionalText(formData, "example_sentence", 4000),
      example_translation: optionalText(
        formData,
        "example_translation",
        4000,
      ),
      notes: optionalText(formData, "notes", 10000),
    },
  };
}

function readTopicIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("topic_ids")
        .map(String)
        .filter((id) => UUID_PATTERN.test(id)),
    ),
  );
}

async function topicIdsAreValid(
  supabase: AuthenticatedClient,
  userId: string,
  profileId: string,
  topicIds: string[],
) {
  if (topicIds.length === 0) return true;
  const { data, error } = await supabase
    .from("language_topics")
    .select("id")
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .in("id", topicIds);
  if (error) throw error;
  return data.length === topicIds.length;
}

async function syncVocabularyTopics(
  supabase: AuthenticatedClient,
  userId: string,
  profileId: string,
  vocabularyItemId: string,
  nextTopicIds: string[],
) {
  const { data: existing, error: existingError } = await supabase
    .from("vocabulary_topics")
    .select("language_topic_id")
    .eq("vocabulary_item_id", vocabularyItemId)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId);
  if (existingError) throw existingError;

  const existingIds = new Set(existing.map((row) => row.language_topic_id));
  const nextIds = new Set(nextTopicIds);
  const additions = nextTopicIds.filter((topicId) => !existingIds.has(topicId));
  const removals = [...existingIds].filter((topicId) => !nextIds.has(topicId));

  // Add first so a stale/deleted selected topic cannot erase valid existing
  // assignments. Composite FKs remain the final cross-profile ownership guard.
  if (additions.length > 0) {
    const { error } = await supabase.from("vocabulary_topics").insert(
      additions.map((topicId) => ({
        user_id: userId,
        language_profile_id: profileId,
        vocabulary_item_id: vocabularyItemId,
        language_topic_id: topicId,
      })),
    );
    if (error) throw error;
  }

  if (removals.length > 0) {
    const { error } = await supabase
      .from("vocabulary_topics")
      .delete()
      .eq("vocabulary_item_id", vocabularyItemId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .in("language_topic_id", removals);
    if (error) throw error;
  }
}

function revalidateLanguageContent(profileId: string, topicId?: string) {
  revalidatePath(`/languages/${profileId}`);
  revalidatePath(`/languages/${profileId}/vocabulary`);
  revalidatePath(`/languages/${profileId}/topics`);
  if (topicId) revalidatePath(`/languages/${profileId}/topics/${topicId}`);
}

function databaseCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  return String(error.code);
}

function databaseMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }
  return String(error.message).toLowerCase();
}

function vocabularyFailure(error: unknown): LanguageContentActionResult {
  console.error("Vocabulary mutation failed:", error);
  return {
    ok: false,
    error: "The vocabulary item could not be saved. Please try again.",
  };
}

function topicFailure(error: unknown): LanguageContentActionResult {
  console.error("Language topic mutation failed:", error);
  if (databaseCode(error) === "23505") {
    return { ok: false, error: "A sibling topic already uses that name." };
  }
  const message = databaseMessage(error);
  if (message.includes("circular") || message.includes("own parent")) {
    return { ok: false, error: "That parent would create a topic cycle." };
  }
  if (databaseCode(error) === "23503" || message.includes("same user")) {
    return { ok: false, error: "That parent topic is no longer available." };
  }
  return { ok: false, error: "The topic could not be saved. Please try again." };
}

export async function createVocabularyItem(
  profileId: string,
  formData: FormData,
): Promise<LanguageContentActionResult> {
  try {
    const input = readVocabulary(formData);
    if (!input.ok) return input;

    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: "This language profile is unavailable." };
    }

    const topicIds = readTopicIds(formData);
    if (!(await topicIdsAreValid(supabase, userId, profileId, topicIds))) {
      return { ok: false, error: "One or more selected topics are unavailable." };
    }

    const { data, error } = await supabase
      .from("vocabulary_items")
      .insert({
        user_id: userId,
        language_profile_id: profileId,
        ...input.data,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (topicIds.length > 0) {
      const { error: relationError } = await supabase
        .from("vocabulary_topics")
        .insert(
          topicIds.map((topicId) => ({
            user_id: userId,
            language_profile_id: profileId,
            vocabulary_item_id: data.id,
            language_topic_id: topicId,
          })),
        );
      if (relationError) {
        await supabase
          .from("vocabulary_items")
          .delete()
          .eq("id", data.id)
          .eq("user_id", userId)
          .eq("language_profile_id", profileId);
        throw relationError;
      }
    }

    revalidateLanguageContent(profileId);
    return { ok: true, id: data.id };
  } catch (error) {
    return vocabularyFailure(error);
  }
}

export async function updateVocabularyItem(
  profileId: string,
  vocabularyItemId: string,
  formData: FormData,
): Promise<LanguageContentActionResult> {
  try {
    const input = readVocabulary(formData);
    if (!input.ok) return input;
    if (!UUID_PATTERN.test(vocabularyItemId)) {
      return { ok: false, error: "This vocabulary item is unavailable." };
    }

    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: "This language profile is unavailable." };
    }

    const topicIds = readTopicIds(formData);
    if (!(await topicIdsAreValid(supabase, userId, profileId, topicIds))) {
      return { ok: false, error: "One or more selected topics are unavailable." };
    }

    const { data, error } = await supabase
      .from("vocabulary_items")
      .update(input.data)
      .eq("id", vocabularyItemId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "This vocabulary item is unavailable." };

    await syncVocabularyTopics(
      supabase,
      userId,
      profileId,
      vocabularyItemId,
      topicIds,
    );

    revalidateLanguageContent(profileId);
    return { ok: true, id: vocabularyItemId };
  } catch (error) {
    return vocabularyFailure(error);
  }
}

export async function archiveVocabularyItem(
  profileId: string,
  vocabularyItemId: string,
): Promise<LanguageContentActionResult> {
  try {
    if (!UUID_PATTERN.test(vocabularyItemId)) {
      return { ok: false, error: "This vocabulary item is unavailable." };
    }
    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: "This language profile is unavailable." };
    }

    const { data, error } = await supabase
      .from("vocabulary_items")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", vocabularyItemId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "This vocabulary item is unavailable." };

    revalidateLanguageContent(profileId);
    return { ok: true, id: vocabularyItemId };
  } catch (error) {
    return vocabularyFailure(error);
  }
}

function readTopic(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = optionalText(formData, "description", 4000);
  const parentRaw = String(formData.get("parent_id") ?? "").trim();
  const parentId = parentRaw && UUID_PATTERN.test(parentRaw) ? parentRaw : null;

  if (!name) return { ok: false as const, error: "Topic name is required." };
  if (name.length > 200) {
    return { ok: false as const, error: "Topic name is too long." };
  }
  if (parentRaw && !parentId) {
    return { ok: false as const, error: "Choose a valid parent topic." };
  }
  return { ok: true as const, data: { name, description, parentId } };
}

async function parentIsValid(
  supabase: AuthenticatedClient,
  userId: string,
  profileId: string,
  parentId: string | null,
) {
  if (!parentId) return true;
  const { data, error } = await supabase
    .from("language_topics")
    .select("id")
    .eq("id", parentId)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function nextTopicPosition(
  supabase: AuthenticatedClient,
  userId: string,
  profileId: string,
  parentId: string | null,
) {
  let query = supabase
    .from("language_topics")
    .select("position")
    .eq("user_id", userId)
    .eq("language_profile_id", profileId);
  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
  const { data, error } = await query
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.position ?? -1) + 1;
}

export async function createLanguageTopic(
  profileId: string,
  formData: FormData,
): Promise<LanguageContentActionResult> {
  try {
    const input = readTopic(formData);
    if (!input.ok) return input;

    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: "This language profile is unavailable." };
    }
    if (!(await parentIsValid(supabase, userId, profileId, input.data.parentId))) {
      return { ok: false, error: "That parent topic is no longer available." };
    }

    const position = await nextTopicPosition(
      supabase,
      userId,
      profileId,
      input.data.parentId,
    );
    const { data, error } = await supabase
      .from("language_topics")
      .insert({
        user_id: userId,
        language_profile_id: profileId,
        parent_id: input.data.parentId,
        name: input.data.name,
        description: input.data.description,
        position,
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidateLanguageContent(profileId, data.id);
    return { ok: true, id: data.id };
  } catch (error) {
    return topicFailure(error);
  }
}

export async function updateLanguageTopic(
  profileId: string,
  topicId: string,
  formData: FormData,
): Promise<LanguageContentActionResult> {
  try {
    const input = readTopic(formData);
    if (!input.ok) return input;
    if (!UUID_PATTERN.test(topicId)) {
      return { ok: false, error: "This topic is unavailable." };
    }
    if (input.data.parentId === topicId) {
      return { ok: false, error: "A topic cannot be its own parent." };
    }

    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: "This language profile is unavailable." };
    }
    if (!(await parentIsValid(supabase, userId, profileId, input.data.parentId))) {
      return { ok: false, error: "That parent topic is no longer available." };
    }

    const { data: current, error: currentError } = await supabase
      .from("language_topics")
      .select("id, parent_id, position")
      .eq("id", topicId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return { ok: false, error: "This topic is unavailable." };

    const parentChanged = current.parent_id !== input.data.parentId;
    const position = parentChanged
      ? await nextTopicPosition(
          supabase,
          userId,
          profileId,
          input.data.parentId,
        )
      : current.position;

    const { data, error } = await supabase
      .from("language_topics")
      .update({
        name: input.data.name,
        description: input.data.description,
        parent_id: input.data.parentId,
        position,
      })
      .eq("id", topicId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "This topic is unavailable." };

    revalidateLanguageContent(profileId, topicId);
    return { ok: true, id: topicId };
  } catch (error) {
    return topicFailure(error);
  }
}

export async function deleteLanguageTopic(
  profileId: string,
  topicId: string,
): Promise<LanguageContentActionResult> {
  try {
    if (!UUID_PATTERN.test(topicId)) {
      return { ok: false, error: "This topic is unavailable." };
    }
    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: "This language profile is unavailable." };
    }

    const { data, error } = await supabase
      .from("language_topics")
      .delete()
      .eq("id", topicId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "This topic is unavailable." };

    revalidateLanguageContent(profileId, topicId);
    return { ok: true, id: topicId };
  } catch (error) {
    return topicFailure(error);
  }
}
