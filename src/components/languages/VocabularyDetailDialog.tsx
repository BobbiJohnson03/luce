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
import { useI18n } from "@/components/i18n/I18nProvider";

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
  const { formatDate, t } = useI18n();
  const displayDate = (value: string) =>
    formatDate(value, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
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
      toast.success(t("vocabulary.archivedToast"));
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
        title={item?.term ?? t("vocabulary.titleFallback")}
        description={item?.translation}
        panelClassName="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto"
      >
        {item && (
          <div>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Detail label={t("vocabulary.definition")} value={item.definition} />
              <Detail label={t("vocabulary.partOfSpeech")} value={item.part_of_speech} />
              <Detail label={t("vocabulary.gender")} value={item.gender} />
              <Detail label={t("vocabulary.plural")} value={item.plural} />
              <Detail label={t("vocabulary.pronunciation")} value={item.pronunciation} />
              <Detail label={t("vocabulary.ipa")} value={item.ipa} />
            </dl>

            {(item.example_sentence || item.example_translation) && (
              <dl className="mt-6 space-y-4 border-t border-border pt-5">
                <Detail label={t("vocabulary.example")} value={item.example_sentence} />
                <Detail
                  label={t("vocabulary.exampleTranslation")}
                  value={item.example_translation}
                />
              </dl>
            )}

            {item.notes && (
              <dl className="mt-6 border-t border-border pt-5">
                <Detail label={t("vocabulary.notes")} value={item.notes} />
              </dl>
            )}

            {assignedTopics.length > 0 && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs tracking-[0.16em] text-muted">
                  {t("vocabulary.topics")}
                </p>
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
              {t("vocabulary.addedUpdated", {
                added: displayDate(item.created_at),
                updated: displayDate(item.updated_at),
              })}
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingArchive(true)}
                className="rounded-full px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
              >
                {t("vocabulary.archive")}
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                {t("common.edit")}
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
        title={t("vocabulary.archiveTitle", { term: item?.term ?? "" })}
        description={t("vocabulary.archiveDescription")}
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingArchive(false)}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("vocabulary.keepItem")}
          </button>
          <button
            type="button"
            onClick={archive}
            disabled={pending}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:border-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? t("vocabulary.archiving") : t("vocabulary.archive")}
          </button>
        </div>
      </Dialog>
    </>
  );
}
