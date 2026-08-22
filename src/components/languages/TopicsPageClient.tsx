"use client";

import { useState } from "react";
import Link from "next/link";
import { sortTopics } from "@/lib/languages/topics";
import type { LanguageTopic } from "@/lib/languages/types";
import { TopicActions } from "./TopicActions";
import { TopicDialog } from "./TopicDialog";

function TopicBranch({
  parentId,
  profileId,
  topics,
  depth,
}: {
  parentId: string | null;
  profileId: string;
  topics: LanguageTopic[];
  depth: number;
}) {
  const children = topics
    .filter((topic) => topic.parent_id === parentId)
    .sort(sortTopics);
  if (children.length === 0) return null;

  return (
    <ul
      className={
        depth === 0
          ? "divide-y divide-border"
          : "ml-5 border-l border-border pl-4 sm:ml-7 sm:pl-5"
      }
    >
      {children.map((topic) => (
        <li key={topic.id}>
          <div className="group flex items-start gap-3 py-3.5">
            <Link
              href={`/languages/${profileId}/topics/${topic.id}`}
              className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <div className="flex items-center gap-2">
                {topics.some((candidate) => candidate.parent_id === topic.id) && (
                  <span aria-hidden="true" className="text-xs text-muted">
                    ›
                  </span>
                )}
                <h3 className="text-base font-light text-foreground transition-colors group-hover:text-accent">
                  {topic.name}
                </h3>
              </div>
              {topic.description && (
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                  {topic.description}
                </p>
              )}
            </Link>
            <TopicActions profileId={profileId} topic={topic} topics={topics} />
          </div>
          <TopicBranch
            parentId={topic.id}
            profileId={profileId}
            topics={topics}
            depth={depth + 1}
          />
        </li>
      ))}
    </ul>
  );
}

export function TopicsPageClient({
  profileId,
  topics,
}: {
  profileId: string;
  topics: LanguageTopic[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-muted">TOPICS</p>
          <h2 className="mt-3 text-3xl font-light tracking-tight">
            {topics.length} {topics.length === 1 ? "topic" : "topics"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Organize vocabulary by meaning, situation, or any structure that helps
            you learn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          + New topic
        </button>
      </div>

      {topics.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-surface/30 px-6 py-14 text-center">
          <h3 className="text-xl font-light">No topics yet.</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Start with a broad area such as Travel, Grammar, or Everyday life.
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-6 rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Create a topic
          </button>
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-border bg-surface/30 px-5 py-2 sm:px-7">
          <TopicBranch
            parentId={null}
            profileId={profileId}
            topics={topics}
            depth={0}
          />
        </section>
      )}

      <TopicDialog
        open={adding}
        onClose={() => setAdding(false)}
        profileId={profileId}
        topics={topics}
      />
    </div>
  );
}
