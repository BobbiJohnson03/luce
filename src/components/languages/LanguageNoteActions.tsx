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
      toast.success(`Note unlinked from ${profileName}. The Note was kept.`);
      setConfirmingUnlink(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu
        label={`${item.note.title || "Untitled"} language actions`}
        items={[
          {
            label: "Open Note",
            onSelect: () => router.push(`/notes/${item.note.id}`),
          },
          {
            label: "Edit language Topics",
            onSelect: () => setEditingTopics(true),
          },
          {
            label: `Unlink from ${profileName}`,
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
            aria-label={`${item.note.title || "Untitled"} actions`}
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
        title={`Unlink from ${profileName}?`}
        description="Only this language relationship and its Topic assignments will be removed. The Note, its content, folder, and other language links will remain unchanged."
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingUnlink(false)}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Keep linked
          </button>
          <button
            type="button"
            onClick={unlink}
            disabled={pending}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:border-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? "Unlinking…" : "Unlink Note"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
