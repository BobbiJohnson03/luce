"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createNote } from "@/app/notes/actions";
import { linkExistingNote } from "@/app/languages/[profileId]/notes/actions";
import { useToast } from "@/components/notes/Toast";
import type {
  LanguageNoteCandidate,
  LanguageNoteListItem,
  LanguageTopic,
} from "@/lib/languages/types";
import { LanguageNoteActions } from "./LanguageNoteActions";
import { LinkExistingNoteDialog } from "./LinkExistingNoteDialog";
import { useI18n } from "@/components/i18n/I18nProvider";

export function LanguageNotesPageClient({
  profileId,
  profileName,
  items,
  topics,
  candidates,
  total,
  query,
  page,
  pageSize,
}: {
  profileId: string;
  profileName: string;
  items: LanguageNoteListItem[];
  topics: LanguageTopic[];
  candidates: LanguageNoteCandidate[];
  total: number;
  query: string;
  page: number;
  pageSize: number;
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
  const [linking, setLinking] = useState(false);
  const [creating, startCreating] = useTransition();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (targetPage > 1) params.set("page", String(targetPage));
    const suffix = params.toString();
    return `/languages/${profileId}/notes${suffix ? `?${suffix}` : ""}`;
  }

  function createFromLanguage() {
    startCreating(async () => {
      const noteResult = await createNote("Untitled", null);
      if (!noteResult.ok) {
        toast.error(t("languageNotes.createFailed"));
        return;
      }
      const noteId = noteResult.data.id;
      const linkResult = await linkExistingNote(profileId, noteId, []);
      if (!linkResult.ok) {
        toast.error(
          t("languageNotes.createdLinkFailed"),
        );
      }
      router.push(`/notes/${noteId}?new=1`);
    });
  }

  return (
    <div className="py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-muted">
            {t("languageNotes.label")}
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-tight">
            {query
              ? t(
                  total === 1
                    ? "languageNotes.resultOne"
                    : "languageNotes.resultOther",
                  { count: total },
                )
              : t(
                  total === 1
                    ? "languageNotes.linkedOne"
                    : "languageNotes.linkedOther",
                  { count: total },
                )}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t("languageNotes.description", { language: profileName })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createFromLanguage}
            disabled={creating}
            className="rounded-full border border-border-strong px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {creating
              ? t("languageNotes.creating")
              : `+ ${t("languageNotes.new")}`}
          </button>
          <button
            type="button"
            onClick={() => setLinking(true)}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            + {t("languageNotes.link")}
          </button>
        </div>
      </div>

      <form
        method="get"
        className="mt-7 flex max-w-2xl flex-col gap-3 sm:flex-row"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("languageNotes.searchAria")}</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("languageNotes.searchPlaceholder")}
            maxLength={160}
            className="w-full rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {t("common.search")}
        </button>
      </form>

      {query && (
        <Link
          href={`/languages/${profileId}/notes`}
          className="mt-3 inline-block text-xs text-muted transition-colors hover:text-foreground"
        >
          {t("common.clearSearch")}
        </Link>
      )}

      {items.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-surface/30 px-6 py-14 text-center">
          <h3 className="text-xl font-light">
            {query ? t("languageNotes.noMatch") : t("languageNotes.empty")}
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {query
              ? t("languageNotes.noMatchHint")
              : t("languageNotes.emptyHint")}
          </p>
        </section>
      ) : (
        <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/30">
          {items.map((item) => {
            const assignedTopics = topics.filter((topic) =>
              item.topic_ids.includes(topic.id),
            );
            return (
              <div
                key={item.link_id}
                className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface sm:px-6"
              >
                <Link
                  href={`/notes/${item.note.id}`}
                  className="group min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <h3 className="truncate text-lg font-light text-foreground transition-colors group-hover:text-accent">
                    {item.note.title || t("notes.untitled")}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
                    {item.folder_path.length > 0 && (
                      <span>{item.folder_path.join(" / ")}</span>
                    )}
                    <span>
                      {t("languageNotes.updated", {
                        date: displayDate(item.note.updated_at),
                      })}
                    </span>
                    {assignedTopics.map((topic) => (
                      <span
                        key={topic.id}
                        className="rounded-full border border-border px-2.5 py-1 text-muted-strong"
                      >
                        {topic.name}
                      </span>
                    ))}
                  </div>
                </Link>
                <LanguageNoteActions
                  profileId={profileId}
                  profileName={profileName}
                  item={item}
                  topics={topics}
                />
              </div>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label={t("languageNotes.pages")}
          className="mt-6 flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="text-muted transition-colors hover:text-foreground"
            >
              ← {t("common.previous")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            {t("common.pageOf", { page, total: pageCount })}
          </span>
          {page < pageCount ? (
            <Link
              href={pageHref(page + 1)}
              className="text-muted transition-colors hover:text-foreground"
            >
              {t("common.next")} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <LinkExistingNoteDialog
        open={linking}
        onClose={() => setLinking(false)}
        profileId={profileId}
        profileName={profileName}
        topics={topics}
        initialCandidates={candidates}
      />
    </div>
  );
}
