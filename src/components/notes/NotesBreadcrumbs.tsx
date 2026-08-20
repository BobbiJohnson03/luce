"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildFolderPath } from "@/lib/notes/tree";
import { useNotesStore } from "./NotesStore";

/**
 * Breadcrumb trail above a note: Notes / Folder / Subfolder / Note title.
 * Folder segments link to that folder; the trail scrolls horizontally on
 * narrow screens instead of wrapping or breaking the layout.
 */
export function NotesBreadcrumbs({
  folderId,
  noteTitle,
}: {
  folderId: string | null;
  noteTitle?: string;
}) {
  const store = useNotesStore();
  const path = useMemo(
    () => buildFolderPath(store.folders, folderId),
    [store.folders, folderId],
  );

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs text-muted [scrollbar-width:none]"
    >
      <Link href="/notes" className="shrink-0 transition-colors hover:text-foreground">
        Notes
      </Link>
      {path.map((folder) => (
        <span key={folder.id} className="flex shrink-0 items-center gap-1.5">
          <span className="text-muted/50">/</span>
          <Link
            href={`/notes?folder=${folder.id}`}
            className="transition-colors hover:text-foreground"
          >
            {folder.name}
          </Link>
        </span>
      ))}
      {noteTitle !== undefined && (
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-muted/50">/</span>
          <span className="text-muted-strong">{noteTitle || "Untitled"}</span>
        </span>
      )}
    </nav>
  );
}
