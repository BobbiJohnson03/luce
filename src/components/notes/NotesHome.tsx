"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { buildTree, buildFolderPath } from "@/lib/notes/tree";
import { useNotesStore } from "./NotesStore";
import { useNotesActions } from "./NotesActions";
import { NotesBreadcrumbs } from "./NotesBreadcrumbs";
import { DocIcon, FolderIcon, PlusIcon, StarIcon } from "./icons";

function CreateButtons({ folderId }: { folderId: string | null }) {
  const actions = useNotesActions();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => actions.createNoteIn(folderId)}
        className="flex items-center gap-2 rounded-full border border-border-strong px-4 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <PlusIcon />
        New note
      </button>
      <button
        onClick={() => actions.createFolderIn(folderId)}
        className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-strong transition-colors hover:border-accent hover:text-foreground"
      >
        <FolderIcon />
        New folder
      </button>
    </div>
  );
}

function NoteCard({
  id,
  title,
  pinned,
}: {
  id: string;
  title: string;
  pinned?: boolean;
}) {
  return (
    <Link
      href={`/notes/${id}`}
      className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface/50 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface"
    >
      <DocIcon className="shrink-0 text-muted" />
      <span className="truncate text-sm text-muted-strong transition-colors group-hover:text-foreground">
        {title || "Untitled"}
      </span>
      {pinned && <StarIcon filled size={11} className="ml-auto text-accent/70" />}
    </Link>
  );
}

/** Contents view for a single folder (reached via a breadcrumb / folder link). */
function FolderView({ folderId }: { folderId: string }) {
  const store = useNotesStore();
  const tree = useMemo(
    () => buildTree(store.folders, store.notes),
    [store.folders, store.notes],
  );

  // Locate this folder's node in the resolved tree.
  const node = useMemo(() => {
    const path = buildFolderPath(store.folders, folderId);
    if (path.length === 0) return null;
    let level = tree.folders;
    let found = null as ReturnType<typeof buildTree>["folders"][number] | null;
    for (const step of path) {
      found = level.find((n) => n.folder.id === step.id) ?? null;
      if (!found) break;
      level = found.folders;
    }
    return found;
  }, [store.folders, folderId, tree]);

  if (!node) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-sm text-muted">This folder no longer exists.</p>
        <Link
          href="/notes"
          className="mt-3 inline-block text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to Notes
        </Link>
      </div>
    );
  }

  const isEmpty = node.folders.length === 0 && node.notes.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <NotesBreadcrumbs folderId={node.folder.parent_id} noteTitle={undefined} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-light tracking-tight">{node.folder.name}</h1>
        <CreateButtons folderId={node.folder.id} />
      </div>

      {isEmpty ? (
        <p className="mt-10 text-sm text-muted">This folder is empty.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {node.folders.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {node.folders.map((f) => (
                <Link
                  key={f.folder.id}
                  href={`/notes?folder=${f.folder.id}`}
                  className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface/50 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface"
                >
                  <FolderIcon className="shrink-0 text-muted" />
                  <span className="truncate text-sm text-muted-strong transition-colors group-hover:text-foreground">
                    {f.folder.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {node.notes.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {node.notes.map((n) => (
                <NoteCard
                  key={n.id}
                  id={n.id}
                  title={n.title}
                  pinned={n.is_pinned}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NotesHome() {
  const store = useNotesStore();
  const params = useSearchParams();
  const folderId = params.get("folder");

  const pinned = useMemo(
    () => store.notes.filter((n) => n.is_pinned),
    [store.notes],
  );
  const recent = useMemo(
    () =>
      [...store.notes]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 6),
    [store.notes],
  );

  if (folderId) return <FolderView folderId={folderId} />;

  const totallyEmpty = store.folders.length === 0 && store.notes.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm tracking-[0.3em] text-muted">CONOSCENZA</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-light tracking-tight">Notes</h1>
        <CreateButtons folderId={null} />
      </div>

      {totallyEmpty ? (
        <div className="mt-14 text-sm leading-relaxed text-muted">
          No notes yet.
          <br />
          Create your first note or folder to get started.
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {pinned.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-1.5 text-[0.7rem] tracking-[0.25em] text-muted">
                <StarIcon filled size={11} className="text-accent/70" />
                PINNED
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {pinned.map((n) => (
                  <NoteCard key={n.id} id={n.id} title={n.title} pinned />
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <div className="mb-3 text-[0.7rem] tracking-[0.25em] text-muted">
                RECENT
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {recent.map((n) => (
                  <NoteCard
                    key={n.id}
                    id={n.id}
                    title={n.title}
                    pinned={n.is_pinned}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
