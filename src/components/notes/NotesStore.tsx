"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NoteFolder, NoteSummary } from "@/lib/notes/types";
import {
  createFolder as createFolderAction,
  createNote as createNoteAction,
  deleteFolder as deleteFolderAction,
  deleteNote as deleteNoteAction,
  moveFolder as moveFolderAction,
  moveNote as moveNoteAction,
  renameFolder as renameFolderAction,
  renameNote as renameNoteAction,
  togglePin as togglePinAction,
} from "@/app/notes/actions";
import { useToast } from "./Toast";
import { useI18n } from "@/components/i18n/I18nProvider";

type NotesStore = {
  folders: NoteFolder[];
  notes: NoteSummary[];

  // expand / collapse (persisted to localStorage)
  isExpanded: (folderId: string) => boolean;
  toggleExpanded: (folderId: string) => void;
  expand: (folderId: string) => void;

  createFolder: (name: string, parentId: string | null) => Promise<string | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFolder: (id: string, parentId: string | null) => Promise<void>;

  createNote: (title: string, folderId: string | null) => Promise<string | null>;
  renameNote: (id: string, title: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  moveNote: (id: string, folderId: string | null) => Promise<void>;
  togglePin: (id: string, next: boolean) => Promise<void>;

  /** Optimistically reflect a title edit coming from the open editor. */
  patchNoteTitle: (id: string, title: string) => void;
};

const Ctx = createContext<NotesStore | null>(null);

export function NotesStoreProvider({
  folders: foldersProp,
  notes: notesProp,
  children,
}: {
  folders: NoteFolder[];
  notes: NoteSummary[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { error: failed } = useToast();
  const { t } = useI18n();

  // Server props are the source of truth; local state allows optimistic edits.
  // We re-seed from props during render (React's recommended way to reset state
  // on a prop change) so revalidations reconcile without a cascading effect.
  const [folders, setFolders] = useState(foldersProp);
  const [notes, setNotes] = useState(notesProp);
  const [seed, setSeed] = useState({ folders: foldersProp, notes: notesProp });
  if (seed.folders !== foldersProp || seed.notes !== notesProp) {
    setSeed({ folders: foldersProp, notes: notesProp });
    setFolders(foldersProp);
    setNotes(notesProp);
  }

  // ── expand / collapse state (in-memory; resets on reload) ───────────────────
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const isExpanded = useCallback((id: string) => expanded.has(id), [expanded]);
  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const expand = useCallback((id: string) => {
    setExpanded((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // ── folder mutations ───────────────────────────────────────────────────────
  const createFolder = useCallback(
    async (name: string, parentId: string | null) => {
      const res = await createFolderAction(name, parentId);
      if (!res.ok) {
        failed(t("notes.errorCreateFolder"));
        return null;
      }
      if (parentId) expand(parentId);
      return res.data.id;
    },
    [expand, failed, t],
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
      const res = await renameFolderAction(id, name);
      if (!res.ok) failed(t("notes.errorRenameFolder"));
    },
    [failed, t],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      const res = await deleteFolderAction(id);
      if (!res.ok) failed(t("notes.errorDeleteFolder"));
    },
    [failed, t],
  );

  const moveFolder = useCallback(
    async (id: string, parentId: string | null) => {
      const res = await moveFolderAction(id, parentId);
      if (!res.ok) failed(res.error || t("notes.errorMoveFolder"));
      else if (parentId) expand(parentId);
    },
    [expand, failed, t],
  );

  // ── note mutations ─────────────────────────────────────────────────────────
  const createNote = useCallback(
    async (title: string, folderId: string | null) => {
      const res = await createNoteAction(title, folderId);
      if (!res.ok) {
        failed(t("notes.errorCreateNote"));
        return null;
      }
      if (folderId) expand(folderId);
      return res.data.id;
    },
    [expand, failed, t],
  );

  const renameNote = useCallback(
    (id: string, title: string) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
      return renameNoteAction(id, title).then((res) => {
        if (!res.ok) failed(t("notes.errorRenameNote"));
      });
    },
    [failed, t],
  );

  const patchNoteTitle = useCallback((id: string, title: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
  }, []);

  const deleteNote = useCallback(
    async (id: string) => {
      const res = await deleteNoteAction(id);
      if (!res.ok) failed(t("notes.errorDeleteNote"));
    },
    [failed, t],
  );

  const moveNote = useCallback(
    async (id: string, folderId: string | null) => {
      const res = await moveNoteAction(id, folderId);
      if (!res.ok) failed(t("notes.errorMoveNote"));
      else if (folderId) expand(folderId);
    },
    [expand, failed, t],
  );

  const togglePin = useCallback(
    async (id: string, next: boolean) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_pinned: next } : n)),
      );
      const res = await togglePinAction(id, next);
      if (!res.ok) {
        failed(t("notes.errorPin"));
        router.refresh();
      }
    },
    [router, failed, t],
  );

  const value = useMemo<NotesStore>(
    () => ({
      folders,
      notes,
      isExpanded,
      toggleExpanded,
      expand,
      createFolder,
      renameFolder,
      deleteFolder,
      moveFolder,
      createNote,
      renameNote,
      deleteNote,
      moveNote,
      togglePin,
      patchNoteTitle,
    }),
    [
      folders,
      notes,
      isExpanded,
      toggleExpanded,
      expand,
      createFolder,
      renameFolder,
      deleteFolder,
      moveFolder,
      createNote,
      renameNote,
      deleteNote,
      moveNote,
      togglePin,
      patchNoteTitle,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotesStore(): NotesStore {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useNotesStore must be used within a NotesStoreProvider");
  return ctx;
}
