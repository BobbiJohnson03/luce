"use client";

import { useState } from "react";
import Link from "next/link";
import { topicPathLabels } from "@/lib/languages/topics";
import type {
  LanguageTopic,
  VocabularyItemWithTopics,
} from "@/lib/languages/types";
import { VocabularyDetailDialog } from "./VocabularyDetailDialog";
import { VocabularyDialog } from "./VocabularyDialog";

export function VocabularyPageClient({
  profileId,
  items,
  topics,
  total,
  query,
  selectedTopicId,
  page,
  pageSize,
}: {
  profileId: string;
  items: VocabularyItemWithTopics[];
  topics: LanguageTopic[];
  total: number;
  query: string;
  selectedTopicId: string;
  page: number;
  pageSize: number;
}) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<VocabularyItemWithTopics | null>(null);
  const [editing, setEditing] = useState<VocabularyItemWithTopics | null>(null);
  const topicLabels = topicPathLabels(topics);
  const hasFilters = Boolean(query || selectedTopicId);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedTopicId) params.set("topic", selectedTopicId);
    if (targetPage > 1) params.set("page", String(targetPage));
    const suffix = params.toString();
    return `/languages/${profileId}/vocabulary${suffix ? `?${suffix}` : ""}`;
  }

  return (
    <div className="py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-muted">VOCABULARY</p>
          <h2 className="mt-3 text-3xl font-light tracking-tight">
            {hasFilters
              ? `${total} ${total === 1 ? "result" : "results"}`
              : `${total} ${total === 1 ? "word" : "words"}`}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          + Add vocabulary
        </button>
      </div>

      <form
        method="get"
        className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.35fr)_auto]"
      >
        <label>
          <span className="sr-only">Search vocabulary</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search vocabulary…"
            className="w-full rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </label>
        <label>
          <span className="sr-only">Filter by topic</span>
          <select
            name="topic"
            defaultValue={selectedTopicId}
            className="w-full rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
          >
            <option value="">All Topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topicLabels.get(topic.id) ?? topic.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Search
        </button>
      </form>

      {hasFilters && (
        <Link
          href={`/languages/${profileId}/vocabulary`}
          className="mt-3 inline-block text-xs text-muted transition-colors hover:text-foreground"
        >
          Clear search and filters
        </Link>
      )}

      {items.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-surface/30 px-6 py-14 text-center">
          <h3 className="text-xl font-light">
            {hasFilters ? "No vocabulary matches." : "No vocabulary yet."}
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {hasFilters
              ? "Try another term, translation, or topic."
              : "Add the first word or expression you want to keep."}
          </p>
          {!hasFilters && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-6 rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Add vocabulary
            </button>
          )}
        </section>
      ) : (
        <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/30">
          {items.map((item) => {
            const assigned = topics.filter((topic) =>
              item.topic_ids.includes(topic.id),
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="group flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-light text-foreground">
                    {item.term}
                  </h3>
                  <p className="mt-1 text-sm text-muted-strong">
                    {item.translation}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted sm:max-w-[45%] sm:justify-end">
                  {[item.part_of_speech, item.gender].filter(Boolean).join(" · ") && (
                    <span>
                      {[item.part_of_speech, item.gender]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                  {assigned.slice(0, 2).map((topic) => (
                    <span
                      key={topic.id}
                      className="rounded-full border border-border px-2.5 py-1"
                    >
                      {topic.name}
                    </span>
                  ))}
                  {assigned.length > 2 && <span>+{assigned.length - 2}</span>}
                  <span className="ml-1 transition-colors group-hover:text-foreground">
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Vocabulary pages"
          className="mt-6 flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="text-muted transition-colors hover:text-foreground"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={pageHref(page + 1)}
              className="text-muted transition-colors hover:text-foreground"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <VocabularyDialog
        open={adding}
        onClose={() => setAdding(false)}
        profileId={profileId}
        topics={topics}
      />
      <VocabularyDetailDialog
        item={selected}
        topics={topics}
        profileId={profileId}
        onClose={() => setSelected(null)}
        onEdit={(item) => {
          setSelected(null);
          setEditing(item);
        }}
      />
      <VocabularyDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        profileId={profileId}
        topics={topics}
        item={editing ?? undefined}
      />
    </div>
  );
}
