"use client";

import { useMemo, useState } from "react";
import type { NoteFolder } from "@/lib/notes/types";
import { flattenFoldersForMove } from "@/lib/notes/tree";
import { Dialog } from "./Dialog";

export function MoveItemDialog({
  open,
  itemName,
  folders,
  currentParentId,
  /** When moving a folder, its own subtree is excluded as a valid target. */
  excludeSubtreeOf,
  onClose,
  onSubmit,
}: {
  open: boolean;
  itemName: string;
  folders: NoteFolder[];
  currentParentId: string | null;
  excludeSubtreeOf?: string;
  onClose: () => void;
  onSubmit: (targetId: string | null) => void;
}) {
  const targets = useMemo(
    () => flattenFoldersForMove(folders, excludeSubtreeOf),
    [folders, excludeSubtreeOf],
  );
  const [selected, setSelected] = useState<string | null>(currentParentId);

  function submit() {
    onSubmit(selected);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Move "${itemName}"`}
      description="Choose a destination folder."
    >
      <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
        {targets.map((t) => {
          const id = t.id ?? "__root__";
          const isCurrent = t.id === currentParentId;
          return (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-2"
              style={{ paddingLeft: `${0.75 + t.depth * 0.9}rem` }}
            >
              <input
                type="radio"
                name="move-target"
                checked={selected === t.id}
                onChange={() => setSelected(t.id)}
                className="accent-[var(--accent)]"
              />
              <span
                className={selected === t.id ? "text-foreground" : "text-muted-strong"}
              >
                {t.name}
                {isCurrent && (
                  <span className="ml-2 text-xs text-muted">(current)</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Move here
        </button>
      </div>
    </Dialog>
  );
}
