"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLanguageTopic,
  updateLanguageTopic,
} from "@/app/languages/[profileId]/actions";
import { Dialog } from "@/components/notes/Dialog";
import { useToast } from "@/components/notes/Toast";
import { topicDescendantIds, topicPathLabels } from "@/lib/languages/topics";
import type { LanguageTopic } from "@/lib/languages/types";
import { useI18n } from "@/components/i18n/I18nProvider";

const fieldClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:cursor-not-allowed disabled:opacity-60";

export function TopicDialog({
  open,
  onClose,
  profileId,
  topics,
  topic,
  defaultParentId = null,
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  topics: LanguageTopic[];
  topic?: LanguageTopic;
  defaultParentId?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const descendants = topic ? topicDescendantIds(topics, topic.id) : new Set<string>();
  const labels = topicPathLabels(topics);
  const parentOptions = topics.filter(
    (candidate) => candidate.id !== topic?.id && !descendants.has(candidate.id),
  );

  function close() {
    if (pending) return;
    setError("");
    onClose();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = topic
        ? await updateLanguageTopic(profileId, topic.id, formData)
        : await createLanguageTopic(profileId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(topic ? t("topics.updatedToast") : t("topics.createdToast"));
      setError("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={topic ? t("topics.edit") : t("topics.new")}
      description={t("topics.dialogDescription")}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.16em] text-muted">
            {t("topics.name")}
          </span>
          <input
            name="name"
            required
            autoComplete="off"
            maxLength={200}
            defaultValue={topic?.name ?? ""}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.16em] text-muted">
            {t("topics.descriptionField")} {" "}
            <span className="tracking-normal">· {t("common.optional")}</span>
          </span>
          <textarea
            name="description"
            rows={3}
            maxLength={4000}
            defaultValue={topic?.description ?? ""}
            className={`${fieldClass} resize-y leading-relaxed`}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.16em] text-muted">
            {t("topics.parent")} {" "}
            <span className="tracking-normal">· {t("common.optional")}</span>
          </span>
          <select
            name="parent_id"
            defaultValue={topic?.parent_id ?? defaultParentId ?? ""}
            className={fieldClass}
          >
            <option value="">{t("topics.noParent")}</option>
            {parentOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {labels.get(candidate.id) ?? candidate.name}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p role="alert" className="text-sm leading-relaxed text-danger">
            {error}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending
              ? t("common.saving")
              : topic
                ? t("languages.saveChanges")
                : t("topics.create")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
