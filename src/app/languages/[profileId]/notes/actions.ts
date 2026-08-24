"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { filterLanguageNoteCandidates } from "@/lib/languages/note-links";
import type {
  LanguageNoteCandidate,
  LanguageNoteLink,
} from "@/lib/languages/types";
import { createClient } from "@/lib/supabase/server";

export type LanguageNoteActionResult<T = { id: string }> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type AuthenticatedClient = Awaited<ReturnType<typeof createClient>>;

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

function normalizeTopicIds(topicIds: string[]) {
  const normalized = Array.from(new Set(topicIds));
  return normalized.every((id) => UUID_PATTERN.test(id)) ? normalized : null;
}

async function topicsBelongToProfile(
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

function revalidateLanguageNote(profileId: string, noteId: string) {
  revalidatePath(`/languages/${profileId}`);
  revalidatePath(`/languages/${profileId}/notes`);
  revalidatePath(`/languages/${profileId}/topics`, "layout");
  revalidatePath(`/notes/${noteId}`);
}

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  return String(error.code);
}

async function failed(error: unknown): Promise<{ ok: false; error: string }> {
  console.error("Language Note mutation failed:", error);
  const { t } = await getI18n();
  if (errorCode(error) === "23505") {
    return { ok: false, error: t("languageNotes.errorDuplicate") };
  }
  return {
    ok: false,
    error: t("languageNotes.errorSave"),
  };
}

export async function searchLinkableNotes(
  profileId: string,
  query: string,
): Promise<LanguageNoteActionResult<LanguageNoteCandidate[]>> {
  try {
    const { t } = await getI18n();
    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: t("languages.profileUnavailable") };
    }

    const cleanQuery = query.trim().slice(0, 160);
    let notesQuery = supabase
      .from("notes")
      .select("id, folder_id, title, is_pinned, position, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(40);
    if (cleanQuery) {
      notesQuery = notesQuery.ilike("title", `%${cleanQuery}%`);
    }

    const { data: noteData, error: noteError } = await notesQuery;
    if (noteError) throw noteError;
    const notes = (noteData as LanguageNoteCandidate[] | null) ?? [];
    if (notes.length === 0) return { ok: true, data: [] };

    const { data: linkData, error: linkError } = await supabase
      .from("language_note_links")
      .select("id, user_id, language_profile_id, note_id, created_at")
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .in(
        "note_id",
        notes.map((note) => note.id),
      );
    if (linkError) throw linkError;

    return {
      ok: true,
      data: filterLanguageNoteCandidates(
        notes,
        (linkData as LanguageNoteLink[] | null) ?? [],
        userId,
        profileId,
      ),
    };
  } catch (error) {
    console.error("Could not search linkable Notes:", error);
    const { t } = await getI18n();
    return { ok: false, error: t("languageNotes.errorSearch") };
  }
}

export async function linkExistingNote(
  profileId: string,
  noteId: string,
  requestedTopicIds: string[],
): Promise<LanguageNoteActionResult> {
  try {
    const { t } = await getI18n();
    if (!UUID_PATTERN.test(noteId)) {
      return { ok: false, error: t("languageNotes.errorNoteUnavailable") };
    }
    const topicIds = normalizeTopicIds(requestedTopicIds);
    if (!topicIds) {
      return { ok: false, error: t("languageNotes.errorTopicsInvalid") };
    }

    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: t("languages.profileUnavailable") };
    }

    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .eq("user_id", userId)
      .maybeSingle();
    if (noteError) throw noteError;
    if (!note) {
      return { ok: false, error: t("languageNotes.errorNoteUnavailable") };
    }
    if (!(await topicsBelongToProfile(supabase, userId, profileId, topicIds))) {
      return { ok: false, error: t("languageNotes.errorTopicsUnavailable") };
    }

    const { data: link, error: linkError } = await supabase
      .from("language_note_links")
      .insert({
        user_id: userId,
        language_profile_id: profileId,
        note_id: noteId,
      })
      .select("id")
      .single();
    if (linkError) throw linkError;

    if (topicIds.length > 0) {
      const { error: topicError } = await supabase
        .from("language_note_topics")
        .insert(
          topicIds.map((topicId) => ({
            user_id: userId,
            language_profile_id: profileId,
            language_note_link_id: link.id,
            language_topic_id: topicId,
          })),
        );
      if (topicError) {
        // Roll back relationship metadata only. The authoritative Note remains.
        await supabase
          .from("language_note_links")
          .delete()
          .eq("id", link.id)
          .eq("user_id", userId)
          .eq("language_profile_id", profileId);
        throw topicError;
      }
    }

    revalidateLanguageNote(profileId, noteId);
    return { ok: true, data: { id: link.id } };
  } catch (error) {
    return failed(error);
  }
}

export async function updateLanguageNoteTopics(
  profileId: string,
  linkId: string,
  requestedTopicIds: string[],
): Promise<LanguageNoteActionResult> {
  try {
    const { t } = await getI18n();
    if (!UUID_PATTERN.test(linkId)) {
      return { ok: false, error: t("languageNotes.errorLinkUnavailable") };
    }
    const topicIds = normalizeTopicIds(requestedTopicIds);
    if (!topicIds) {
      return { ok: false, error: t("languageNotes.errorTopicsInvalid") };
    }

    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: t("languages.profileUnavailable") };
    }
    if (!(await topicsBelongToProfile(supabase, userId, profileId, topicIds))) {
      return { ok: false, error: t("languageNotes.errorTopicsUnavailable") };
    }

    const { data: link, error: linkError } = await supabase
      .from("language_note_links")
      .select("id, note_id")
      .eq("id", linkId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .maybeSingle();
    if (linkError) throw linkError;
    if (!link) {
      return { ok: false, error: t("languageNotes.errorLinkUnavailable") };
    }

    const { data: existing, error: existingError } = await supabase
      .from("language_note_topics")
      .select("language_topic_id")
      .eq("language_note_link_id", linkId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId);
    if (existingError) throw existingError;

    const currentIds = new Set(existing.map((row) => row.language_topic_id));
    const nextIds = new Set(topicIds);
    const additions = topicIds.filter((topicId) => !currentIds.has(topicId));
    const removals = [...currentIds].filter((topicId) => !nextIds.has(topicId));

    if (additions.length > 0) {
      const { error } = await supabase.from("language_note_topics").insert(
        additions.map((topicId) => ({
          user_id: userId,
          language_profile_id: profileId,
          language_note_link_id: linkId,
          language_topic_id: topicId,
        })),
      );
      if (error) throw error;
    }

    if (removals.length > 0) {
      const { error } = await supabase
        .from("language_note_topics")
        .delete()
        .eq("language_note_link_id", linkId)
        .eq("user_id", userId)
        .eq("language_profile_id", profileId)
        .in("language_topic_id", removals);
      if (error) throw error;
    }

    revalidateLanguageNote(profileId, link.note_id);
    return { ok: true, data: { id: linkId } };
  } catch (error) {
    return failed(error);
  }
}

export async function unlinkLanguageNote(
  profileId: string,
  linkId: string,
): Promise<LanguageNoteActionResult> {
  try {
    const { t } = await getI18n();
    if (!UUID_PATTERN.test(linkId)) {
      return { ok: false, error: t("languageNotes.errorLinkUnavailable") };
    }
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("language_note_links")
      .delete()
      .eq("id", linkId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .select("id, note_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return { ok: false, error: t("languageNotes.errorLinkUnavailable") };
    }

    revalidateLanguageNote(profileId, data.note_id);
    return { ok: true, data: { id: linkId } };
  } catch (error) {
    return failed(error);
  }
}
