import { LanguageNotesPageClient } from "@/components/languages/LanguageNotesPageClient";
import { filterLanguageNoteCandidates, groupLanguageNoteTopicIds } from "@/lib/languages/note-links";
import {
  LANGUAGE_TOPIC_COLUMNS,
  loadLanguageProfile,
} from "@/lib/languages/server";
import type {
  LanguageNoteCandidate,
  LanguageNoteLink,
  LanguageNoteListItem,
  LanguageTopic,
} from "@/lib/languages/types";
import { buildFolderPath } from "@/lib/notes/tree";
import type { NoteFolder } from "@/lib/notes/types";

const PAGE_SIZE = 50;
const LINK_COLUMNS =
  "id, user_id, language_profile_id, note_id, created_at, note:notes!language_note_links_note_owner_fk!inner(id, folder_id, title, is_pinned, position, updated_at)";

type LinkedNoteRow = LanguageNoteLink & { note: LanguageNoteCandidate };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LanguageNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profileId } = await params;
  const filters = await searchParams;
  const query = firstParam(filters.q).trim().slice(0, 160);
  const pageRaw = Number.parseInt(firstParam(filters.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const from = (page - 1) * PAGE_SIZE;

  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  let linkQuery = supabase
    .from("language_note_links")
    .select(LINK_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .eq("language_profile_id", profileId);
  if (query) linkQuery = linkQuery.ilike("notes.title", `%${query}%`);

  const [linkResult, topicResult, folderResult, candidateResult] =
    await Promise.all([
      linkQuery
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1),
      supabase
        .from("language_topics")
        .select(LANGUAGE_TOPIC_COLUMNS)
        .eq("user_id", userId)
        .eq("language_profile_id", profileId)
        .order("position", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("note_folders")
        .select("id, name, parent_id, position, created_at, updated_at")
        .eq("user_id", userId),
      supabase
        .from("notes")
        .select("id, folder_id, title, is_pinned, position, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);

  if (linkResult.error || topicResult.error || folderResult.error) {
    console.error("Could not load Language Notes:", {
      links: linkResult.error,
      topics: topicResult.error,
      folders: folderResult.error,
    });
    return (
      <div className="py-12">
        <p className="text-xs tracking-[0.25em] text-muted">NOTES</p>
        <h2 className="mt-4 text-2xl font-light">Linked Notes are unavailable.</h2>
        <p className="mt-3 text-sm text-muted">Please refresh and try again.</p>
      </div>
    );
  }

  const linkRows = (linkResult.data ?? []) as unknown as LinkedNoteRow[];
  const topics = (topicResult.data as LanguageTopic[] | null) ?? [];
  const folders = (folderResult.data as NoteFolder[] | null) ?? [];
  const topicIdsByLink = new Map<string, string[]>();
  if (linkRows.length > 0) {
    const { data, error } = await supabase
      .from("language_note_topics")
      .select("language_note_link_id, language_topic_id")
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .in(
        "language_note_link_id",
        linkRows.map((link) => link.id),
      );
    if (error) console.error("Could not load Language Note Topics:", error);
    else {
      for (const [linkId, topicIds] of groupLanguageNoteTopicIds(data)) {
        topicIdsByLink.set(linkId, topicIds);
      }
    }
  }

  const items: LanguageNoteListItem[] = linkRows.map((link) => ({
    link_id: link.id,
    link_created_at: link.created_at,
    note: link.note,
    topic_ids: topicIdsByLink.get(link.id) ?? [],
    folder_path: link.note.folder_id
      ? buildFolderPath(folders, link.note.folder_id).map((folder) => folder.name)
      : [],
  }));

  let candidates: LanguageNoteCandidate[] = [];
  if (!candidateResult.error) {
    const recentNotes =
      (candidateResult.data as LanguageNoteCandidate[] | null) ?? [];
    if (recentNotes.length > 0) {
      const { data: existingLinkData, error: existingLinkError } = await supabase
        .from("language_note_links")
        .select("id, user_id, language_profile_id, note_id, created_at")
        .eq("user_id", userId)
        .eq("language_profile_id", profileId)
        .in(
          "note_id",
          recentNotes.map((note) => note.id),
        );
      if (existingLinkError) {
        console.error("Could not load existing Language Note links:", existingLinkError);
      } else {
        candidates = filterLanguageNoteCandidates(
          recentNotes,
          (existingLinkData as LanguageNoteLink[] | null) ?? [],
          userId,
          profileId,
        );
      }
    }
  } else {
    console.error("Could not load Note link candidates:", candidateResult.error);
  }

  return (
    <LanguageNotesPageClient
      profileId={profileId}
      profileName={profile.language_name}
      items={items}
      topics={topics}
      candidates={candidates}
      total={linkResult.count ?? 0}
      query={query}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
