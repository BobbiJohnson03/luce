"use client";

import { useState } from "react";
import Link from "next/link";
import { sortTopics } from "@/lib/languages/topics";
import type {
  LanguageNoteCandidate,
  LanguageTopic,
  VocabularyItem,
} from "@/lib/languages/types";
import { TopicActions } from "./TopicActions";
import { TopicDialog } from "./TopicDialog";
import { useI18n } from "@/components/i18n/I18nProvider";

export function TopicDetailClient({
  profileId,
  topic,
  topics,
  vocabulary,
  vocabularyCount,
  linkedNotes,
  linkedNoteCount,
  page,
  pageSize,
}: {
  profileId: string;
  topic: LanguageTopic;
  topics: LanguageTopic[];
  vocabulary: VocabularyItem[];
  vocabularyCount: number;
  linkedNotes: LanguageNoteCandidate[];
  linkedNoteCount: number;
  page: number;
  pageSize: number;
}) {
  const [addingChild, setAddingChild] = useState(false);
  const { t } = useI18n();
  const children = topics
    .filter((candidate) => candidate.parent_id === topic.id)
    .sort(sortTopics);
  const pageCount = Math.max(1, Math.ceil(vocabularyCount / pageSize));

  return (
    <div className="py-8">
      <Link
        href={`/languages/${profileId}/topics`}
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        {t("topics.all")}
      </Link>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.25em] text-muted">
            {t("topics.singularLabel")}
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-tight sm:text-4xl">
            {topic.name}
          </h2>
          {topic.description && (
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted-strong">
              {topic.description}
            </p>
          )}
        </div>
        <TopicActions
          profileId={profileId}
          topic={topic}
          topics={topics}
          detail
        />
      </div>

      <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <section className="rounded-2xl border border-border bg-surface/30 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted">
                {t("topics.childLabel")}
              </p>
              <p className="mt-2 text-sm text-muted-strong">
                {t(
                  children.length === 1
                    ? "topics.countOne"
                    : "topics.countOther",
                  { count: children.length },
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddingChild(true)}
              className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              + {t("topics.addChild")}
            </button>
          </div>

          {children.length === 0 ? (
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {t("topics.noChildren")}
            </p>
          ) : (
            <div className="mt-5 divide-y divide-border border-t border-border">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/languages/${profileId}/topics/${child.id}`}
                  className="group flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="text-foreground transition-colors group-hover:text-accent">
                    {child.name}
                  </span>
                  <span className="text-muted">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface/30 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted">
                {t("vocabulary.label")}
              </p>
              <p className="mt-2 text-sm text-muted-strong">
                {t(
                  vocabularyCount === 1
                    ? "topics.vocabularyItemsOne"
                    : "topics.vocabularyItemsOther",
                  { count: vocabularyCount },
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {vocabularyCount > 0 && (
                <Link
                  href={`/languages/${profileId}/practice?topic=${topic.id}`}
                  className="text-xs text-muted transition-colors hover:text-foreground"
                >
                  {t("topics.practice")}
                </Link>
              )}
              <Link
                href={`/languages/${profileId}/vocabulary?topic=${topic.id}`}
                className="text-xs text-muted transition-colors hover:text-foreground"
              >
                {t("topics.filteredView")}
              </Link>
            </div>
          </div>

          {vocabulary.length === 0 ? (
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {t("topics.noVocabulary")}
            </p>
          ) : (
            <div className="mt-5 divide-y divide-border border-t border-border">
              {vocabulary.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
                >
                  <span className="text-sm text-foreground">{item.term}</span>
                  <span className="text-sm text-muted">{item.translation}</span>
                </div>
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav
              aria-label={t("topics.vocabularyPages")}
              className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"
            >
              {page > 1 ? (
                <Link
                  href={`?page=${page - 1}`}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  ← {t("common.previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                {t("common.pageOf", { page, total: pageCount })}
              </span>
              {page < pageCount ? (
                <Link
                  href={`?page=${page + 1}`}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  {t("common.next")} →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface/30 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted">
              {t("notes.label")}
            </p>
            <p className="mt-2 text-sm text-muted-strong">
              {t(
                linkedNoteCount === 1
                  ? "topics.notesCountOne"
                  : "topics.notesCountOther",
                { count: linkedNoteCount },
              )}
            </p>
          </div>
          <Link
            href={`/languages/${profileId}/notes`}
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            {t("topics.openNotes")}
          </Link>
        </div>

        {linkedNotes.length === 0 ? (
          <p className="mt-6 text-sm leading-relaxed text-muted">
            {t("topics.noNotes")}
          </p>
        ) : (
          <div className="mt-5 divide-y divide-border border-t border-border">
            {linkedNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="group flex items-center justify-between gap-4 py-3 text-sm"
              >
                <span className="truncate text-foreground transition-colors group-hover:text-accent">
                  {note.title || t("notes.untitled")}
                </span>
                <span className="shrink-0 text-muted">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <TopicDialog
        open={addingChild}
        onClose={() => setAddingChild(false)}
        profileId={profileId}
        topics={topics}
        defaultParentId={topic.id}
      />
    </div>
  );
}
