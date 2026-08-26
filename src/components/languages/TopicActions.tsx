"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLanguageTopic } from "@/app/languages/[profileId]/actions";
import { Dialog } from "@/components/notes/Dialog";
import { DropdownMenu } from "@/components/notes/DropdownMenu";
import { useToast } from "@/components/notes/Toast";
import { topicDescendantIds } from "@/lib/languages/topics";
import type { LanguageTopic } from "@/lib/languages/types";
import { TopicDialog } from "./TopicDialog";
import { useI18n } from "@/components/i18n/I18nProvider";

export function TopicActions({
  profileId,
  topic,
  topics,
  detail = false,
}: {
  profileId: string;
  topic: LanguageTopic;
  topics: LanguageTopic[];
  detail?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const descendantCount = topicDescendantIds(topics, topic.id).size;

  function remove() {
    startTransition(async () => {
      const result = await deleteLanguageTopic(profileId, topic.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("topics.deletedToast"));
      setConfirmingDelete(false);
      if (detail) router.push(`/languages/${profileId}/topics`);
      router.refresh();
    });
  }

  return (
    <>
      {detail ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-border-strong px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("topics.edit")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-full px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
          >
            {t("topics.delete")}
          </button>
        </div>
      ) : (
        <DropdownMenu
          label={t("topics.actions", { name: topic.name })}
          items={[
            { label: t("topics.edit"), onSelect: () => setEditing(true) },
            {
              label: t("topics.delete"),
              danger: true,
              onSelect: () => setConfirmingDelete(true),
            },
          ]}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={t("topics.actions", { name: topic.name })}
              className="rounded-full px-2 py-1 text-lg leading-none text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              ···
            </button>
          )}
        />
      )}

      <TopicDialog
        open={editing}
        onClose={() => setEditing(false)}
        profileId={profileId}
        topics={topics}
        topic={topic}
      />

      <Dialog
        open={confirmingDelete}
        onClose={() => {
          if (!pending) setConfirmingDelete(false);
        }}
        title={t("topics.deleteTitle", { name: topic.name })}
        description={
          descendantCount > 0
            ? t("topics.deleteNested", { count: descendantCount })
            : t("topics.deleteSingle")
        }
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("topics.keep")}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:border-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? t("topics.deleting") : t("topics.delete")}
          </button>
        </div>
      </Dialog>
    </>
  );
}
