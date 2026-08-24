import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/notes/types";
import { NoteEditorScreen } from "@/components/notes/NoteEditorScreen";
import {
  LANGUAGE_PROFILE_COLUMNS,
  LANGUAGE_TOPIC_COLUMNS,
} from "@/lib/languages/server";
import { groupLanguageNoteTopicIds } from "@/lib/languages/note-links";
import type {
  LanguageNoteLink,
  LanguageProfile,
  LanguageTopic,
  NoteLanguageAssociation,
} from "@/lib/languages/types";

function NoteUnavailable() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-sm tracking-[0.2em] text-muted">404</p>
      <h1 className="mt-3 text-2xl font-light">This note is unavailable.</h1>
      <p className="mt-2 text-sm text-muted">
        It may have been deleted or does not belong to you.
      </p>
      <Link
        href="/notes"
        className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to Notes
      </Link>
    </div>
  );
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, folder_id, title, is_pinned, position, updated_at, created_at, content, search_text",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return <NoteUnavailable />;

  const [linkResult, profileResult, topicResult] = await Promise.all([
    supabase
      .from("language_note_links")
      .select("id, user_id, language_profile_id, note_id, created_at")
      .eq("user_id", user.id)
      .eq("note_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("language_profiles")
      .select(LANGUAGE_PROFILE_COLUMNS)
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("language_topics")
      .select(LANGUAGE_TOPIC_COLUMNS)
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (linkResult.error || profileResult.error || topicResult.error) {
    console.error("Could not load Note language metadata:", {
      links: linkResult.error,
      profiles: profileResult.error,
      topics: topicResult.error,
    });
  }

  const links = linkResult.error
    ? []
    : ((linkResult.data as LanguageNoteLink[] | null) ?? []);
  const profiles = profileResult.error
    ? []
    : ((profileResult.data as LanguageProfile[] | null) ?? []);
  const topics = topicResult.error
    ? []
    : ((topicResult.data as LanguageTopic[] | null) ?? []);
  let topicIdsByLink = new Map<string, string[]>();
  if (links.length > 0) {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from("language_note_topics")
      .select("language_note_link_id, language_topic_id")
      .eq("user_id", user.id)
      .in(
        "language_note_link_id",
        links.map((link) => link.id),
      );
    if (assignmentError) {
      console.error("Could not load Note language Topics:", assignmentError);
    } else {
      topicIdsByLink = groupLanguageNoteTopicIds(assignmentData);
    }
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const associations: NoteLanguageAssociation[] = links.flatMap((link) => {
    const profile = profileById.get(link.language_profile_id);
    return profile
      ? [
          {
            link_id: link.id,
            language_profile_id: profile.id,
            language_name: profile.language_name,
            profile_archived_at: profile.archived_at,
            topic_ids: topicIdsByLink.get(link.id) ?? [],
          },
        ]
      : [];
  });

  return (
    <Suspense fallback={null}>
      <NoteEditorScreen
        note={data as Note}
        languageAssociations={associations}
        languageProfiles={profiles}
        languageTopics={topics}
      />
    </Suspense>
  );
}
