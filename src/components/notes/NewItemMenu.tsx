"use client";

import { useNotesActions } from "./NotesActions";
import { DropdownMenu } from "./DropdownMenu";
import { DocIcon, FolderIcon, PlusIcon } from "./icons";

/** The "+ New" affordance in the sidebar (root-level note / folder creation). */
export function NewItemMenu() {
  const actions = useNotesActions();
  return (
    <DropdownMenu
      align="start"
      label="Create new"
      items={[
        {
          label: "New note",
          icon: <DocIcon />,
          onSelect: () => actions.createNoteIn(null),
        },
        {
          label: "New folder",
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
          New
        </button>
      )}
    />
  );
}
