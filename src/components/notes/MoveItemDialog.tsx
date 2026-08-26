"use client";

import { useMemo, useState } from "react";
import type { NoteFolder } from "@/lib/notes/types";
import { flattenFoldersForMove } from "@/lib/notes/tree";
import { Dialog } from "./Dialog";
import { useI18n } from "@/components/i18n/I18nProvider";

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
  const { t } = useI18n();
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
      title={t("notes.moveTitle", { name: itemName })}
      description={t("notes.moveDescription")}
    >
      <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
        {targets.map((target) => {
          const id = target.id ?? "__root__";
          const isCurrent = target.id === currentParentId;
          return (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-2"
              style={{ paddingLeft: `${0.75 + target.depth * 0.9}rem` }}
            >
              <input
                type="radio"
                name="move-target"
                checked={selected === target.id}
                onChange={() => setSelected(target.id)}
                className="accent-[var(--accent)]"
              />
              <span
                className={
                  selected === target.id
                    ? "text-foreground"
                    : "text-muted-strong"
                }
              >
                {target.id === null ? t("notes.root") : target.name}
                {isCurrent && (
                  <span className="ml-2 text-xs text-muted">
                    ({t("notes.current")})
                  </span>
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
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {t("notes.moveHere")}
        </button>
      </div>
    </Dialog>
  );
}
