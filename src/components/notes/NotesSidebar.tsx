"use client";

import Link from "next/link";
import { NewItemMenu } from "./NewItemMenu";
import { NotesSearch } from "./NotesSearch";
import { PinnedNotes } from "./PinnedNotes";
import { NotesTree } from "./NotesTree";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Left column of the Notes workspace: header, search, pinned and the tree. */
export function NotesSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <Link
          href="/notes"
          onClick={onNavigate}
          className="text-sm tracking-[0.25em] text-muted transition-colors hover:text-foreground"
        >
          {t("notes.label")}
        </Link>
        <NewItemMenu />
      </div>

      <NotesSearch onNavigate={onNavigate} />

      <PinnedNotes onNavigate={onNavigate} />

      <div className="-mx-1 flex-1 overflow-y-auto pb-6">
        <NotesTree onNavigate={onNavigate} />
      </div>
    </div>
  );
}
