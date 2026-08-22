"use client";

import { useState } from "react";
import Link from "next/link";
import { sortTopics } from "@/lib/languages/topics";
import type {
  LanguageTopic,
  VocabularyItem,
} from "@/lib/languages/types";
import { TopicActions } from "./TopicActions";
import { TopicDialog } from "./TopicDialog";

export function TopicDetailClient({
  profileId,
  topic,
  topics,
  vocabulary,
  vocabularyCount,
  page,
  pageSize,
}: {
  profileId: string;
  topic: LanguageTopic;
  topics: LanguageTopic[];
  vocabulary: VocabularyItem[];
  vocabularyCount: number;
  page: number;
  pageSize: number;
}) {
  const [addingChild, setAddingChild] = useState(false);
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
        ← All topics
      </Link>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.25em] text-muted">TOPIC</p>
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
              <p className="text-xs tracking-[0.2em] text-muted">CHILD TOPICS</p>
              <p className="mt-2 text-sm text-muted-strong">
                {children.length} {children.length === 1 ? "topic" : "topics"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddingChild(true)}
              className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              + Add child
            </button>
          </div>

          {children.length === 0 ? (
            <p className="mt-6 text-sm leading-relaxed text-muted">
              This topic has no nested topics.
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
              <p className="text-xs tracking-[0.2em] text-muted">VOCABULARY</p>
              <p className="mt-2 text-sm text-muted-strong">
                {vocabularyCount} {vocabularyCount === 1 ? "item" : "items"}
              </p>
            </div>
            <Link
              href={`/languages/${profileId}/vocabulary?topic=${topic.id}`}
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              Open filtered view →
            </Link>
          </div>

          {vocabulary.length === 0 ? (
            <p className="mt-6 text-sm leading-relaxed text-muted">
              No active vocabulary is assigned to this topic.
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
              aria-label="Topic vocabulary pages"
              className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"
            >
              {page > 1 ? (
                <Link
                  href={`?page=${page - 1}`}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <Link
                  href={`?page=${page + 1}`}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      </div>

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
