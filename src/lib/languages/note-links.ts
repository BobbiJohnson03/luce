type NoteIdentity = { id: string };
type LinkIdentity = {
  id: string;
  user_id: string;
  language_profile_id: string;
  note_id: string;
};
type TopicIdentity = {
  language_note_link_id: string;
  language_topic_id: string;
};

/** Duplicate means the same owned Note is already linked to the same profile. */
export function hasLanguageNoteLink(
  links: LinkIdentity[],
  userId: string,
  profileId: string,
  noteId: string,
) {
  return links.some(
    (link) =>
      link.user_id === userId &&
      link.language_profile_id === profileId &&
      link.note_id === noteId,
  );
}

/** A Note linked elsewhere remains a candidate; only this profile excludes it. */
export function filterLanguageNoteCandidates<T extends NoteIdentity>(
  notes: T[],
  links: LinkIdentity[],
  userId: string,
  profileId: string,
) {
  const linkedIds = new Set(
    links
      .filter(
        (link) =>
          link.user_id === userId && link.language_profile_id === profileId,
      )
      .map((link) => link.note_id),
  );
  return notes.filter((note) => !linkedIds.has(note.id));
}

/** Topic assignments are keyed by link, preserving per-profile context. */
export function groupLanguageNoteTopicIds(assignments: TopicIdentity[]) {
  const byLink = new Map<string, string[]>();
  for (const assignment of assignments) {
    const topicIds = byLink.get(assignment.language_note_link_id) ?? [];
    if (!topicIds.includes(assignment.language_topic_id)) {
      topicIds.push(assignment.language_topic_id);
    }
    byLink.set(assignment.language_note_link_id, topicIds);
  }
  return byLink;
}

/** Unlink transformation removes metadata only; the Note collection is intact. */
export function removeLanguageNoteLink<
  TNote extends NoteIdentity,
  TLink extends LinkIdentity,
  TTopic extends TopicIdentity,
>(
  notes: TNote[],
  links: TLink[],
  topics: TTopic[],
  linkId: string,
) {
  return {
    notes,
    links: links.filter((link) => link.id !== linkId),
    topics: topics.filter(
      (topic) => topic.language_note_link_id !== linkId,
    ),
  };
}
