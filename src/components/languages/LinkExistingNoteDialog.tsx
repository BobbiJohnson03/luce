"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  linkExistingNote,
  searchLinkableNotes,
} from "@/app/languages/[profileId]/notes/actions";
import { Dialog } from "@/components/notes/Dialog";
import { useToast } from "@/components/notes/Toast";
import { topicPathLabels } from "@/lib/languages/topics";
import type {
  LanguageNoteCandidate,
  LanguageTopic,
} from "@/lib/languages/types";

export function LinkExistingNoteDialog({
  open,
  onClose,
  profileId,
  profileName,
  topics,
  initialCandidates,
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  topics: LanguageTopic[];
  initialCandidates: LanguageNoteCandidate[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const labels = topicPathLabels(topics);

  function resetAndClose() {
    if (pending) return;
    setQuery("");
    setSelectedNoteId("");
    setSelectedTopics(new Set());
    setError("");
    onClose();
  }

  function search(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await searchLinkableNotes(profileId, query);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCandidates(result.data);
      if (!result.data.some((note) => note.id === selectedNoteId)) {
        setSelectedNoteId("");
      }
    });
  }

  function link() {
    if (!selectedNoteId) {
      setError("Choose a Note to link.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await linkExistingNote(
        profileId,
        selectedNoteId,
        [...selectedTopics],
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Note linked to ${profileName}.`);
      setCandidates((current) =>
        current.filter((note) => note.id !== selectedNoteId),
      );
      setSelectedNoteId("");
      setSelectedTopics(new Set());
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={resetAndClose}
      title="Link existing Note"
      description={`Choose one of your existing Luce Notes for ${profileName}. No Note content will be copied.`}
      panelClassName="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto"
    >
      <form onSubmit={search} className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search existing Notes</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Notes by title…"
            maxLength={160}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-border-strong px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <fieldset className="mt-5">
        <legend className="text-xs tracking-[0.16em] text-muted">NOTES</legend>
        {candidates.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            No unlinked Notes match this search.
          </p>
        ) : (
          <div className="mt-2 max-h-48 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {candidates.map((note) => (
              <label
                key={note.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2"
              >
                <input
                  type="radio"
                  name="note"
                  value={note.id}
                  checked={selectedNoteId === note.id}
                  onChange={() => setSelectedNoteId(note.id)}
                  className="size-4 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {note.title || "Untitled"}
                </span>
                <time className="shrink-0 text-xs text-muted">
                  {new Date(note.updated_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </time>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {topics.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-xs tracking-[0.16em] text-muted">
            LANGUAGE TOPICS <span className="tracking-normal">· optional</span>
          </legend>
          <div className="mt-2 grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {topics.map((topic) => (
              <label
                key={topic.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm text-muted-strong transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedTopics.has(topic.id)}
                  onChange={(event) => {
                    setSelectedTopics((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(topic.id);
                      else next.delete(topic.id);
                      return next;
                    });
                  }}
                  className="mt-0.5 size-4 accent-[var(--accent)]"
                />
                <span>{labels.get(topic.id) ?? topic.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={resetAndClose}
          disabled={pending}
          className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={link}
          disabled={pending || !selectedNoteId}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Linking…" : "Link Note"}
        </button>
      </div>
    </Dialog>
  );
}
