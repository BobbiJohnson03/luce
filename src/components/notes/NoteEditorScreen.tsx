"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Note, NoteContent } from "@/lib/notes/types";
import { saveNoteContent } from "@/app/notes/actions";
import { useNotesStore } from "./NotesStore";
import { useNotesActions } from "./NotesActions";
import { useToast } from "./Toast";
import { NotesBreadcrumbs } from "./NotesBreadcrumbs";
import { DropdownMenu, type MenuItem } from "./DropdownMenu";
import { MoreIcon, MoveIcon, StarIcon, TrashIcon } from "./icons";

function EditorSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-3" aria-hidden="true">
      <div className="h-4 w-2/3 rounded bg-surface-2" />
      <div className="h-4 w-1/2 rounded bg-surface-2" />
      <div className="h-4 w-5/6 rounded bg-surface-2" />
    </div>
  );
}

const NoteEditor = dynamic(
  () => import("./NoteEditor").then((m) => m.NoteEditor),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

type Status = "saved" | "saving" | "error";

function SaveStatus({ status }: { status: Status }) {
  const label =
    status === "saving" ? "Saving…" : status === "error" ? "Save failed" : "Saved";
  return (
    <span
      className={[
        "flex items-center gap-1.5 text-xs",
        status === "error" ? "text-red-400" : "text-muted",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      {status === "saved" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2.5 6.5l2.5 2.5 4.5-5.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {label}
    </span>
  );
}

export function NoteEditorScreen({ note }: { note: Note }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useNotesStore();
  const actions = useNotesActions();
  const { error: toastError } = useToast();

  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<Status>("saved");

  // A note has its own route/page instance, so note.id is stable for this
  // component's lifetime — safe to close over directly.
  const noteId = note.id;
  const titleRef = useRef(note.title);
  const contentRef = useRef<NoteContent>(note.content ?? []);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Live pin / folder come from the store so the header stays in sync.
  const summary = store.notes.find((n) => n.id === note.id);
  const isPinned = summary?.is_pinned ?? note.is_pinned;
  const folderId = summary?.folder_id ?? note.folder_id;

  const doSave = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setStatus("saving");
    const res = await saveNoteContent(
      noteId,
      titleRef.current,
      contentRef.current,
    );
    if (res.ok) {
      setStatus("saved");
    } else {
      dirtyRef.current = true;
      setStatus("error");
      toastError("Autosave failed — your latest edits are not saved yet.");
    }
  }, [noteId, toastError]);

  const schedule = useCallback(() => {
    dirtyRef.current = true;
    setStatus("saving");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void doSave(), 700);
  }, [doSave]);

  const onTitleChange = (value: string) => {
    setTitle(value);
    titleRef.current = value;
    store.patchNoteTitle(noteId, value.trim() || "Untitled");
    schedule();
  };

  const onContentChange = useCallback(
    (blocks: NoteContent) => {
      contentRef.current = blocks;
      schedule();
    },
    [schedule],
  );

  // Flush pending edits when leaving this note via client navigation.
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (dirtyRef.current) {
        void saveNoteContent(noteId, titleRef.current, contentRef.current);
      }
    };
  }, [noteId]);

  // Flush on hard unload (refresh / tab close) via a beacon.
  useEffect(() => {
    const flushBeacon = () => {
      if (!dirtyRef.current) return;
      const payload = JSON.stringify({
        title: titleRef.current,
        content: contentRef.current,
      });
      navigator.sendBeacon(
        `/api/notes/${noteId}`,
        new Blob([payload], { type: "application/json" }),
      );
      dirtyRef.current = false;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushBeacon();
    };
    window.addEventListener("pagehide", flushBeacon);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushBeacon);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [noteId]);

  // Focus & select the title when arriving from "create note".
  const titleInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [searchParams]);

  const menuItems: MenuItem[] = [
    {
      label: isPinned ? "Unpin" : "Pin",
      icon: <StarIcon filled={isPinned} />,
      onSelect: () => store.togglePin(note.id, !isPinned),
    },
    {
      label: "Move",
      icon: <MoveIcon />,
      onSelect: () =>
        actions.requestMove({
          kind: "note",
          id: note.id,
          name: titleRef.current || "Untitled",
          folderId,
        }),
    },
    {
      label: "Delete",
      icon: <TrashIcon />,
      danger: true,
      onSelect: () =>
        actions.requestDelete(
          {
            kind: "note",
            id: note.id,
            name: titleRef.current || "Untitled",
            folderId,
          },
          () => {
            dirtyRef.current = false; // don't resurrect a deleted note
            router.push("/notes");
          },
        ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <NotesBreadcrumbs folderId={folderId} />
        <div className="flex shrink-0 items-center gap-3">
          <SaveStatus status={status} />
          <DropdownMenu
            items={menuItems}
            label="Note actions"
            trigger={({ toggle, ref, open }) => (
              <button
                ref={ref}
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Note actions"
                className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
              >
                <MoreIcon />
              </button>
            )}
          />
        </div>
      </div>

      <input
        ref={titleInputRef}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled"
        aria-label="Note title"
        className="mt-5 w-full bg-transparent text-3xl font-light tracking-tight text-foreground outline-none placeholder:text-muted/40"
      />

      <div className="mt-4">
        <NoteEditor
          key={note.id}
          initialContent={note.content ?? []}
          onChange={onContentChange}
        />
      </div>
    </div>
  );
}
