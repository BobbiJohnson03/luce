"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveVocabularyItem } from "@/app/languages/[profileId]/actions";
import { Dialog } from "@/components/notes/Dialog";
import { useToast } from "@/components/notes/Toast";
import type {
  LanguageTopic,
  VocabularyItemWithTopics,
} from "@/lib/languages/types";

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {value}
      </dd>
    </div>
  );
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function VocabularyDetailDialog({
  item,
  topics,
  profileId,
  onClose,
  onEdit,
}: {
  item: VocabularyItemWithTopics | null;
  topics: LanguageTopic[];
  profileId: string;
  onClose: () => void;
  onEdit: (item: VocabularyItemWithTopics) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [pending, startTransition] = useTransition();
  const assignedTopics = item
    ? topics.filter((topic) => item.topic_ids.includes(topic.id))
    : [];

  function archive() {
    if (!item) return;
    startTransition(async () => {
      const result = await archiveVocabularyItem(profileId, item.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Vocabulary archived.");
      setConfirmingArchive(false);
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <Dialog
        open={Boolean(item) && !confirmingArchive}
        onClose={onClose}
        title={item?.term ?? "Vocabulary"}
        description={item?.translation}
        panelClassName="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto"
      >
        {item && (
          <div>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Detail label="DEFINITION" value={item.definition} />
              <Detail label="PART OF SPEECH" value={item.part_of_speech} />
              <Detail label="GENDER" value={item.gender} />
              <Detail label="PLURAL" value={item.plural} />
              <Detail label="PRONUNCIATION" value={item.pronunciation} />
              <Detail label="IPA" value={item.ipa} />
            </dl>

            {(item.example_sentence || item.example_translation) && (
              <dl className="mt-6 space-y-4 border-t border-border pt-5">
                <Detail label="EXAMPLE" value={item.example_sentence} />
                <Detail
                  label="EXAMPLE TRANSLATION"
                  value={item.example_translation}
                />
              </dl>
            )}

            {item.notes && (
              <dl className="mt-6 border-t border-border pt-5">
                <Detail label="NOTES" value={item.notes} />
              </dl>
            )}

            {assignedTopics.length > 0 && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs tracking-[0.16em] text-muted">TOPICS</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assignedTopics.map((topic) => (
                    <span
                      key={topic.id}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-strong"
                    >
                      {topic.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
              Added {displayDate(item.created_at)} · Updated {displayDate(item.updated_at)}
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingArchive(true)}
                className="rounded-full px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(item) && confirmingArchive}
        onClose={() => {
          if (!pending) setConfirmingArchive(false);
        }}
        title={`Archive ${item?.term ?? "this item"}?`}
        description="It will disappear from normal vocabulary and topic views. Its content and topic relationships will remain stored."
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingArchive(false)}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Keep item
          </button>
          <button
            type="button"
            onClick={archive}
            disabled={pending}
            className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-400 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
          >
            {pending ? "Archiving…" : "Archive"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
