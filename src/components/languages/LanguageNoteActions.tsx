"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlinkLanguageNote } from "@/app/languages/[profileId]/notes/actions";
import { Dialog } from "@/components/notes/Dialog";
import { DropdownMenu } from "@/components/notes/DropdownMenu";
import { useToast } from "@/components/notes/Toast";
import type {
  LanguageNoteListItem,
  LanguageTopic,
} from "@/lib/languages/types";
import { LanguageNoteTopicsDialog } from "./LanguageNoteTopicsDialog";
import { useI18n } from "@/components/i18n/I18nProvider";

export function LanguageNoteActions({
  profileId,
  profileName,
  item,
  topics,
}: {
  profileId: string;
  profileName: string;
  item: LanguageNoteListItem;
  topics: LanguageTopic[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const noteTitle = item.note.title || t("notes.untitled");
  const [editingTopics, setEditingTopics] = useState(false);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [pending, startTransition] = useTransition();

  function unlink() {
    startTransition(async () => {
      const result = await unlinkLanguageNote(profileId, item.link_id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("languageNotes.unlinkedToast", { language: profileName }));
      setConfirmingUnlink(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu
        label={t("languageNotes.actions", { title: noteTitle })}
        items={[
          {
            label: t("languageNotes.open"),
            onSelect: () => router.push(`/notes/${item.note.id}`),
          },
          {
            label: t("languageNotes.editTopics"),
            onSelect: () => setEditingTopics(true),
          },
          {
            label: t("languageNotes.unlinkFrom", { language: profileName }),
            danger: true,
            onSelect: () => setConfirmingUnlink(true),
          },
        ]}
        trigger={({ toggle, ref, open }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={t("languageNotes.noteActions", { title: noteTitle })}
            className="rounded-full px-2 py-1 text-lg leading-none text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            ···
          </button>
        )}
      />

      <LanguageNoteTopicsDialog
        open={editingTopics}
        onClose={() => setEditingTopics(false)}
        profileId={profileId}
        profileName={profileName}
        noteId={item.note.id}
        linkId={item.link_id}
        topics={topics}
        selectedTopicIds={item.topic_ids}
      />

      <Dialog
        open={confirmingUnlink}
        onClose={() => {
          if (!pending) setConfirmingUnlink(false);
        }}
        title={t("languageNotes.unlinkTitle", { language: profileName })}
        description={t("languageNotes.unlinkDescription")}
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingUnlink(false)}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("languageNotes.keep")}
          </button>
          <button
            type="button"
            onClick={unlink}
            disabled={pending}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:border-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? t("languageNotes.unlinking") : t("languageNotes.unlink")}
          </button>
        </div>
      </Dialog>
    </>
  );
}
