"use client";

import { useNotesActions } from "./NotesActions";
import { DropdownMenu } from "./DropdownMenu";
import { DocIcon, FolderIcon, PlusIcon } from "./icons";
import { useI18n } from "@/components/i18n/I18nProvider";

/** The "+ New" affordance in the sidebar (root-level note / folder creation). */
export function NewItemMenu() {
  const actions = useNotesActions();
  const { t } = useI18n();
  return (
    <DropdownMenu
      align="start"
      label={t("notes.createNew")}
      items={[
        {
          label: t("notes.newNote"),
          icon: <DocIcon />,
          onSelect: () => actions.createNoteIn(null),
        },
        {
          label: t("notes.newFolder"),
          icon: <FolderIcon />,
          onSelect: () => actions.createFolderIn(null),
        },
      ]}
      trigger={({ toggle, ref, open }) => (
        <button
          ref={ref}
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full border border-border-strong px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <PlusIcon />
          {t("notes.new")}
        </button>
      )}
    />
  );
}
