"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { buildTree } from "@/lib/notes/tree";
import type { FolderNode, NoteSummary } from "@/lib/notes/types";
import { useNotesStore } from "./NotesStore";
import { useNotesActions } from "./NotesActions";
import { DropdownMenu, type MenuItem } from "./DropdownMenu";
import {
  ChevronIcon,
  DocIcon,
  EditIcon,
  FolderIcon,
  MoreIcon,
  MoveIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "./icons";

const INDENT = 0.85; // rem per depth level

function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  return (
    <DropdownMenu
      items={items}
      label={label}
      trigger={({ toggle, ref }) => (
        <button
          ref={ref}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          aria-label={label}
          className="rounded-md p-1 text-muted opacity-0 transition-all hover:text-foreground focus:opacity-100 group-hover:opacity-100"
        >
          <MoreIcon />
        </button>
      )}
    />
  );
}

function NoteRow({
  note,
  depth,
  selected,
  onNavigate,
}: {
  note: NoteSummary;
  depth: number;
  selected: boolean;
  onNavigate?: () => void;
}) {
  const store = useNotesStore();
  const actions = useNotesActions();

  const items: MenuItem[] = [
    {
      label: note.is_pinned ? "Unpin" : "Pin",
      icon: <StarIcon filled={note.is_pinned} />,
      onSelect: () => store.togglePin(note.id, !note.is_pinned),
    },
    {
      label: "Rename",
      icon: <EditIcon />,
      onSelect: () =>
        actions.requestRename({
          kind: "note",
          id: note.id,
          name: note.title,
          folderId: note.folder_id,
        }),
    },
    {
      label: "Move",
      icon: <MoveIcon />,
      onSelect: () =>
        actions.requestMove({
          kind: "note",
          id: note.id,
          name: note.title,
          folderId: note.folder_id,
        }),
    },
    {
      label: "Delete",
      icon: <TrashIcon />,
      danger: true,
      onSelect: () =>
        actions.requestDelete({
          kind: "note",
          id: note.id,
          name: note.title,
          folderId: note.folder_id,
        }),
    },
  ];

  return (
    <div
      className={[
        "group flex items-center gap-1.5 rounded-lg pr-1 transition-colors",
        selected ? "bg-surface-2" : "hover:bg-surface-2/60",
      ].join(" ")}
      style={{ paddingLeft: `${0.35 + depth * INDENT}rem` }}
    >
      <Link
        href={`/notes/${note.id}`}
        onClick={onNavigate}
        aria-current={selected ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-sm"
      >
        <DocIcon className="shrink-0 text-muted" />
        <span
          className={[
            "truncate",
            selected ? "text-foreground" : "text-muted-strong",
          ].join(" ")}
        >
          {note.title || "Untitled"}
        </span>
        {note.is_pinned && (
          <StarIcon filled size={11} className="shrink-0 text-accent/70" />
        )}
      </Link>
      <RowMenu items={items} label={`Actions for ${note.title || "note"}`} />
    </div>
  );
}

function FolderRow({
  node,
  depth,
  onNavigate,
}: {
  node: FolderNode;
  depth: number;
  onNavigate?: () => void;
}) {
  const store = useNotesStore();
  const actions = useNotesActions();
  const params = useParams<{ noteId?: string }>();
  const open = store.isExpanded(node.folder.id);
  const isEmpty = node.folders.length === 0 && node.notes.length === 0;

  const items: MenuItem[] = [
    {
      label: "New note",
      icon: <PlusIcon />,
      onSelect: () => actions.createNoteIn(node.folder.id),
    },
    {
      label: "New folder",
      icon: <FolderIcon />,
      onSelect: () => actions.createFolderIn(node.folder.id),
    },
    {
      label: "Rename",
      icon: <EditIcon />,
      onSelect: () =>
        actions.requestRename({
          kind: "folder",
          id: node.folder.id,
          name: node.folder.name,
          parentId: node.folder.parent_id,
        }),
    },
    {
      label: "Move",
      icon: <MoveIcon />,
      onSelect: () =>
        actions.requestMove({
          kind: "folder",
          id: node.folder.id,
          name: node.folder.name,
          parentId: node.folder.parent_id,
        }),
    },
    {
      label: "Delete",
      icon: <TrashIcon />,
      danger: true,
      onSelect: () =>
        actions.requestDelete({
          kind: "folder",
          id: node.folder.id,
          name: node.folder.name,
          parentId: node.folder.parent_id,
        }),
    },
  ];

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-surface-2/60"
        style={{ paddingLeft: `${0.1 + depth * INDENT}rem` }}
      >
        <button
          onClick={() => store.toggleExpanded(node.folder.id)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${node.folder.name}` : `Expand ${node.folder.name}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-sm"
        >
          <ChevronIcon
            className={[
              "shrink-0 text-muted transition-transform",
              open ? "rotate-90" : "",
            ].join(" ")}
          />
          <FolderIcon className="shrink-0 text-muted" />
          <span className="truncate text-muted-strong">{node.folder.name}</span>
        </button>
        <RowMenu items={items} label={`Actions for ${node.folder.name}`} />
      </div>

      {open && (
        <div>
          {isEmpty && (
            <p
              className="py-1 text-xs text-muted/70"
              style={{ paddingLeft: `${0.1 + (depth + 1) * INDENT + 0.4}rem` }}
            >
              Empty
            </p>
          )}
          {node.folders.map((child) => (
            <FolderRow
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
          {node.notes.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              depth={depth + 1}
              selected={params.noteId === n.id}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NotesTree({ onNavigate }: { onNavigate?: () => void }) {
  const store = useNotesStore();
  const params = useParams<{ noteId?: string }>();
  const tree = useMemo(
    () => buildTree(store.folders, store.notes),
    [store.folders, store.notes],
  );

  const empty = tree.folders.length === 0 && tree.notes.length === 0;

  if (empty) {
    return (
      <div className="px-2 py-6 text-sm leading-relaxed text-muted">
        No notes yet.
        <br />
        Create your first note or folder.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {tree.folders.map((node) => (
        <FolderRow key={node.folder.id} node={node} depth={0} onNavigate={onNavigate} />
      ))}
      {tree.notes.map((n) => (
        <NoteRow
          key={n.id}
          note={n}
          depth={0}
          selected={params.noteId === n.id}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
