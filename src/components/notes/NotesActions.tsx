"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { countFolderContents } from "@/lib/notes/tree";
import { useNotesStore } from "./NotesStore";
import { RenameDialog } from "./RenameDialog";
import { MoveItemDialog } from "./MoveItemDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

export type FolderTarget = {
  kind: "folder";
  id: string;
  name: string;
  parentId: string | null;
};
export type NoteTarget = {
  kind: "note";
  id: string;
  name: string;
  folderId: string | null;
};
export type Target = FolderTarget | NoteTarget;

type NotesActionsApi = {
  createNoteIn: (folderId: string | null) => Promise<void>;
  createFolderIn: (parentId: string | null) => void;
  requestRename: (target: Target) => void;
  requestMove: (target: Target) => void;
  requestDelete: (target: Target, onDeleted?: () => void) => void;
};

const Ctx = createContext<NotesActionsApi | null>(null);

export function NotesActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const store = useNotesStore();

  const [renameTarget, setRenameTarget] = useState<Target | null>(null);
  const [moveTarget, setMoveTarget] = useState<Target | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null);
  const [onDeletedCb, setOnDeletedCb] = useState<(() => void) | null>(null);
  const [createFolderParent, setCreateFolderParent] = useState<
    string | null | undefined
  >(undefined);

  const createNoteIn = useCallback(
    async (folderId: string | null) => {
      const id = await store.createNote("Untitled", folderId);
      if (id) router.push(`/notes/${id}?new=1`);
    },
    [router, store],
  );

  const createFolderIn = useCallback((parentId: string | null) => {
    setCreateFolderParent(parentId);
  }, []);

  const requestRename = useCallback((t: Target) => setRenameTarget(t), []);
  const requestMove = useCallback((t: Target) => setMoveTarget(t), []);
  const requestDelete = useCallback((t: Target, onDeleted?: () => void) => {
    setDeleteTarget(t);
    // Wrap in a function so React's state setter stores it rather than calling it.
    setOnDeletedCb(() => onDeleted ?? null);
  }, []);

  const api = useMemo<NotesActionsApi>(
    () => ({
      createNoteIn,
      createFolderIn,
      requestRename,
      requestMove,
      requestDelete,
    }),
    [createNoteIn, createFolderIn, requestRename, requestMove, requestDelete],
  );

  // ── delete confirmation copy (folders warn about nested content) ────────────
  let deleteTitle = "";
  let deleteMessage = "";
  if (deleteTarget) {
    if (deleteTarget.kind === "folder") {
      const { folders: fc, notes: nc } = countFolderContents(
        store.folders,
        store.notes,
        deleteTarget.id,
      );
      deleteTitle = `Delete "${deleteTarget.name}"?`;
      deleteMessage =
        fc + nc === 0
          ? "This folder is empty. This action cannot be undone."
          : `This folder contains ${fc} ${fc === 1 ? "folder" : "folders"} and ${nc} ${nc === 1 ? "note" : "notes"}. Everything inside will be permanently deleted. This action cannot be undone.`;
    } else {
      deleteTitle = `Delete "${deleteTarget.name}"?`;
      deleteMessage = "This note will be permanently deleted. This action cannot be undone.";
    }
  }

  return (
    <Ctx.Provider value={api}>
      {children}

      <RenameDialog
        open={renameTarget !== null}
        initialValue={renameTarget?.name ?? ""}
        label={
          renameTarget?.kind === "folder" ? "Rename folder" : "Rename note"
        }
        onClose={() => setRenameTarget(null)}
        onSubmit={(value) => {
          if (!renameTarget) return;
          if (renameTarget.kind === "folder")
            store.renameFolder(renameTarget.id, value);
          else store.renameNote(renameTarget.id, value);
        }}
      />

      <RenameDialog
        open={createFolderParent !== undefined}
        initialValue="New folder"
        label="New folder"
        onClose={() => setCreateFolderParent(undefined)}
        onSubmit={(value) => {
          store.createFolder(value, createFolderParent ?? null);
        }}
      />

      {moveTarget && (
        <MoveItemDialog
          open
          itemName={moveTarget.name}
          folders={store.folders}
          currentParentId={
            moveTarget.kind === "folder"
              ? moveTarget.parentId
              : moveTarget.folderId
          }
          excludeSubtreeOf={
            moveTarget.kind === "folder" ? moveTarget.id : undefined
          }
          onClose={() => setMoveTarget(null)}
          onSubmit={(destId) => {
            if (moveTarget.kind === "folder")
              store.moveFolder(moveTarget.id, destId);
            else store.moveNote(moveTarget.id, destId);
          }}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={deleteTitle}
        message={deleteMessage}
        onClose={() => {
          setDeleteTarget(null);
          setOnDeletedCb(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "folder")
            store.deleteFolder(deleteTarget.id);
          else store.deleteNote(deleteTarget.id);
          onDeletedCb?.();
        }}
      />
    </Ctx.Provider>
  );
}

export function useNotesActions(): NotesActionsApi {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useNotesActions must be used within NotesActionsProvider");
  return ctx;
}
