import { describe, expect, it } from "vitest";
import {
  filterLanguageNoteCandidates,
  groupLanguageNoteTopicIds,
  hasLanguageNoteLink,
  removeLanguageNoteLink,
} from "./note-links";

const links = [
  { id: "link-it", user_id: "user", language_profile_id: "it", note_id: "n1" },
  { id: "link-de", user_id: "user", language_profile_id: "de", note_id: "n1" },
];

describe("language Note link state", () => {
  it("detects duplicates only within the same owner and profile", () => {
    expect(hasLanguageNoteLink(links, "user", "it", "n1")).toBe(true);
    expect(hasLanguageNoteLink(links, "user", "fr", "n1")).toBe(false);
    expect(hasLanguageNoteLink(links, "other", "it", "n1")).toBe(false);
  });

  it("keeps a Note linkable to another Language Profile", () => {
    const notes = [{ id: "n1" }, { id: "n2" }];
    expect(filterLanguageNoteCandidates(notes, links, "user", "it")).toEqual([
      { id: "n2" },
    ]);
    expect(filterLanguageNoteCandidates(notes, links, "user", "fr")).toEqual(
      notes,
    );
  });

  it("groups Topic mappings by their profile-specific link", () => {
    const grouped = groupLanguageNoteTopicIds([
      { language_note_link_id: "link-it", language_topic_id: "grammar-it" },
      { language_note_link_id: "link-de", language_topic_id: "grammar-de" },
      { language_note_link_id: "link-it", language_topic_id: "verbs-it" },
    ]);
    expect(grouped.get("link-it")).toEqual(["grammar-it", "verbs-it"]);
    expect(grouped.get("link-de")).toEqual(["grammar-de"]);
  });

  it("unlinks metadata without removing or copying the Note", () => {
    const notes = [{ id: "n1" }, { id: "n2" }];
    const topics = [
      { language_note_link_id: "link-it", language_topic_id: "grammar-it" },
      { language_note_link_id: "link-de", language_topic_id: "grammar-de" },
    ];
    const next = removeLanguageNoteLink(notes, links, topics, "link-it");

    expect(next.notes).toBe(notes);
    expect(next.notes).toHaveLength(2);
    expect(next.links).toEqual([links[1]]);
    expect(next.topics).toEqual([topics[1]]);
  });
});
