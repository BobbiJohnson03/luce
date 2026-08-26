"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  linkExistingNote,
  updateLanguageNoteTopics,
} from "@/app/languages/[profileId]/notes/actions";
import { Dialog } from "@/components/notes/Dialog";
import { useToast } from "@/components/notes/Toast";
import { topicPathLabels } from "@/lib/languages/topics";
import type { LanguageTopic } from "@/lib/languages/types";
import { useI18n } from "@/components/i18n/I18nProvider";

export function LanguageNoteTopicsDialog({
  open,
  onClose,
  profileId,
  profileName,
  noteId,
  linkId,
  topics,
  selectedTopicIds,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  noteId: string;
  linkId?: string;
  topics: LanguageTopic[];
  selectedTopicIds: string[];
  onSaved?: (linkId: string, topicIds: string[]) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set(selectedTopicIds));
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(new Set(selectedTopicIds));
      setError("");
    }
  }
  const labels = topicPathLabels(topics);

  function close() {
    if (!pending) onClose();
  }

  function save() {
    const topicIds = [...selected];
    startTransition(async () => {
      const result = linkId
        ? await updateLanguageNoteTopics(profileId, linkId, topicIds)
        : await linkExistingNote(profileId, noteId, topicIds);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        linkId
          ? t("languageNotes.topicsUpdated")
          : t("languageNotes.linkedToast", { language: profileName }),
      );
      onSaved?.(result.data.id, topicIds);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t(linkId ? "languageNotes.topicsTitle" : "languageNotes.linkTitle", {
        language: profileName,
      })}
      description={
        topics.length > 0
          ? t("languageNotes.topicsDescription")
          : t("languageNotes.noTopicsDescription")
      }
    >
      {topics.length > 0 && (
        <fieldset>
          <legend className="text-xs tracking-[0.16em] text-muted">
            {t("languageNotes.topicsOptional")}
          </legend>
          <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
            {topics.map((topic) => (
              <label
                key={topic.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm text-muted-strong transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selected.has(topic.id)}
                  onChange={(event) => {
                    setSelected((current) => {
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
          onClick={close}
          disabled={pending}
          className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending
            ? t("common.saving")
            : linkId
              ? t("languageNotes.saveTopics")
              : t("languageNotes.link")}
        </button>
      </div>
    </Dialog>
  );
}
