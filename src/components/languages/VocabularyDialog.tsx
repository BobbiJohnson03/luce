"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createVocabularyItem,
  updateVocabularyItem,
} from "@/app/languages/[profileId]/actions";
import { Dialog } from "@/components/notes/Dialog";
import { useToast } from "@/components/notes/Toast";
import { topicPathLabels } from "@/lib/languages/topics";
import type {
  LanguageTopic,
  VocabularyItemWithTopics,
} from "@/lib/languages/types";
import { useI18n } from "@/components/i18n/I18nProvider";

const fieldClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  name,
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  maxLength: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs tracking-[0.16em] text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        className={fieldClass}
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  maxLength,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  maxLength: number;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs tracking-[0.16em] text-muted">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        rows={rows}
        className={`${fieldClass} resize-y leading-relaxed`}
      />
    </label>
  );
}

export function VocabularyDialog({
  open,
  onClose,
  profileId,
  topics,
  item,
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  topics: LanguageTopic[];
  item?: VocabularyItemWithTopics;
}) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const labels = topicPathLabels(topics);

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
      const result = item
        ? await updateVocabularyItem(profileId, item.id, formData)
        : await createVocabularyItem(profileId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(
        item ? t("vocabulary.updatedToast") : t("vocabulary.addedToast"),
      );
      setError("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={item ? t("vocabulary.edit") : t("vocabulary.add")}
      description={t("vocabulary.dialogDescription")}
      panelClassName="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-muted">
              {t("vocabulary.term")}
            </span>
            <input
              name="term"
              required
              autoComplete="off"
              maxLength={300}
              defaultValue={item?.term ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.16em] text-muted">
              {t("vocabulary.translation")}
            </span>
            <input
              name="translation"
              required
              autoComplete="off"
              maxLength={500}
              defaultValue={item?.translation ?? ""}
              className={fieldClass}
            />
          </label>
        </div>

        <details className="group rounded-xl border border-border bg-background/20 px-4 py-3">
          <summary className="cursor-pointer list-none text-sm text-muted-strong outline-none transition-colors hover:text-foreground focus-visible:text-foreground">
            <span className="mr-2 inline-block transition-transform group-open:rotate-90">
              ›
            </span>
            {t("vocabulary.moreDetails")}
          </summary>
          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
            <TextAreaField
              label={t("vocabulary.definition")}
              name="definition"
              defaultValue={item?.definition}
              maxLength={4000}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={t("vocabulary.partOfSpeech")}
                name="part_of_speech"
                defaultValue={item?.part_of_speech}
                maxLength={120}
              />
              <Field
                label={t("vocabulary.gender")}
                name="gender"
                defaultValue={item?.gender}
                maxLength={120}
              />
              <Field
                label={t("vocabulary.plural")}
                name="plural"
                defaultValue={item?.plural}
                maxLength={300}
              />
              <Field
                label={t("vocabulary.pronunciation")}
                name="pronunciation"
                defaultValue={item?.pronunciation}
                maxLength={500}
              />
            </div>
            <Field
              label={t("vocabulary.ipa")}
              name="ipa"
              defaultValue={item?.ipa}
              maxLength={500}
            />
            <TextAreaField
              label={t("vocabulary.exampleSentence")}
              name="example_sentence"
              defaultValue={item?.example_sentence}
              maxLength={4000}
            />
            <TextAreaField
              label={t("vocabulary.exampleTranslation")}
              name="example_translation"
              defaultValue={item?.example_translation}
              maxLength={4000}
            />
            <TextAreaField
              label={t("vocabulary.notes")}
              name="notes"
              defaultValue={item?.notes}
              maxLength={10000}
              rows={4}
            />
          </div>
        </details>

        {topics.length > 0 && (
          <fieldset className="rounded-xl border border-border px-4 py-3">
            <legend className="px-1 text-xs tracking-[0.16em] text-muted">
              {t("vocabulary.topics")}
            </legend>
            <div className="mt-1 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {topics.map((topic) => (
                <label
                  key={topic.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm text-muted-strong transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <input
                    type="checkbox"
                    name="topic_ids"
                    value={topic.id}
                    defaultChecked={item?.topic_ids.includes(topic.id)}
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                  />
                  <span>{labels.get(topic.id) ?? topic.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

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
              : item
                ? t("languages.saveChanges")
                : t("vocabulary.add")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
