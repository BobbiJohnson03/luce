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
      toast.success("Topic deleted. Vocabulary was kept.");
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
            Edit topic
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-full px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete topic
          </button>
        </div>
      ) : (
        <DropdownMenu
          label={`${topic.name} actions`}
          items={[
            { label: "Edit topic", onSelect: () => setEditing(true) },
            {
              label: "Delete topic",
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
              aria-label={`${topic.name} actions`}
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
        title={`Delete ${topic.name}?`}
        description={
          descendantCount > 0
            ? `This removes the topic and its ${descendantCount} nested ${descendantCount === 1 ? "topic" : "topics"}. Topic assignments will be removed, but every vocabulary item will remain.`
            : "This removes the topic and its vocabulary assignments. Every vocabulary item will remain."
        }
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Keep topic
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-400 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete topic"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
