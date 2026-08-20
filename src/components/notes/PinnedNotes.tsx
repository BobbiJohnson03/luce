"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useNotesStore } from "./NotesStore";
import { DocIcon, StarIcon } from "./icons";

export function PinnedNotes({ onNavigate }: { onNavigate?: () => void }) {
  const store = useNotesStore();
  const params = useParams<{ noteId?: string }>();

  const pinned = useMemo(
    () =>
      store.notes
        .filter((n) => n.is_pinned)
        .sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
        ),
    [store.notes],
  );

  if (pinned.length === 0) return null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 px-2 text-[0.7rem] tracking-[0.2em] text-muted">
        <StarIcon filled size={11} className="text-accent/70" />
        PINNED
      </div>
      <div className="flex flex-col">
        {pinned.map((n) => {
          const selected = params.noteId === n.id;
          return (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              onClick={onNavigate}
              aria-current={selected ? "page" : undefined}
              className={[
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                selected
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-strong hover:bg-surface-2/60",
              ].join(" ")}
            >
              <DocIcon className="shrink-0 text-muted" />
              <span className="truncate">{n.title || "Untitled"}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
