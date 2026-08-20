import type {
  FolderNode,
  NoteFolder,
  NoteSummary,
  NotesTree,
} from "./types";

const ROOT = "__root__";

function compareFolders(a: NoteFolder, b: NoteFolder): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function compareNotes(a: NoteSummary, b: NoteSummary): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

/**
 * Build the recursive notes tree from flat folder + note lists in O(n).
 *
 * Defensive against malformed data: folders whose parent is missing are treated
 * as roots, and cycles are broken (a folder is only ever emitted once) so the
 * UI can never recurse infinitely even if the database somehow contains a loop.
 */
export function buildTree(
  folders: NoteFolder[],
  notes: NoteSummary[],
): NotesTree {
  const folderById = new Map<string, NoteFolder>();
  for (const f of folders) folderById.set(f.id, f);

  const childFoldersOf = new Map<string, NoteFolder[]>();
  const notesOf = new Map<string, NoteSummary[]>();

  const push = <T>(map: Map<string, T[]>, key: string, value: T) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };

  for (const f of folders) {
    const parentKey =
      f.parent_id && folderById.has(f.parent_id) ? f.parent_id : ROOT;
    push(childFoldersOf, parentKey, f);
  }

  for (const n of notes) {
    const key = n.folder_id && folderById.has(n.folder_id) ? n.folder_id : ROOT;
    push(notesOf, key, n);
  }

  const visited = new Set<string>();

  const buildNode = (folder: NoteFolder): FolderNode => {
    visited.add(folder.id);
    const children = (childFoldersOf.get(folder.id) ?? [])
      .filter((c) => !visited.has(c.id))
      .sort(compareFolders)
      .map(buildNode);
    const childNotes = (notesOf.get(folder.id) ?? []).slice().sort(compareNotes);
    return { folder, folders: children, notes: childNotes };
  };

  const rootFolders = (childFoldersOf.get(ROOT) ?? [])
    .slice()
    .sort(compareFolders)
    .map(buildNode);

  // Belt-and-suspenders: surface any folder stranded by a cycle at the root.
  for (const f of folders) {
    if (!visited.has(f.id)) rootFolders.push(buildNode(f));
  }

  const rootNotes = (notesOf.get(ROOT) ?? []).slice().sort(compareNotes);

  return { folders: rootFolders, notes: rootNotes };
}

/**
 * Return the ids of every folder nested (at any depth) under `folderId`,
 * excluding `folderId` itself.
 */
export function getDescendantFolderIds(
  folders: NoteFolder[],
  folderId: string,
): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const f of folders) {
    if (!f.parent_id) continue;
    const list = childrenOf.get(f.parent_id);
    if (list) list.push(f.id);
    else childrenOf.set(f.parent_id, [f.id]);
  }

  const result: string[] = [];
  const stack = [...(childrenOf.get(folderId) ?? [])];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue; // guard against cycles
    seen.add(id);
    result.push(id);
    for (const child of childrenOf.get(id) ?? []) stack.push(child);
  }
  return result;
}

/**
 * True if `candidateId` is `folderId` itself or nested anywhere beneath it.
 * Used to forbid moving a folder into its own subtree (which would create a cycle).
 */
export function isSelfOrDescendant(
  folders: NoteFolder[],
  folderId: string,
  candidateId: string,
): boolean {
  if (folderId === candidateId) return true;
  return getDescendantFolderIds(folders, folderId).includes(candidateId);
}

/** Count folders and notes nested under `folderId` (inclusive of direct children). */
export function countFolderContents(
  folders: NoteFolder[],
  notes: NoteSummary[],
  folderId: string,
): { folders: number; notes: number } {
  const ids = new Set([folderId, ...getDescendantFolderIds(folders, folderId)]);
  const folderCount = ids.size - 1; // exclude the folder itself
  const noteCount = notes.filter(
    (n) => n.folder_id && ids.has(n.folder_id),
  ).length;
  return { folders: folderCount, notes: noteCount };
}

/**
 * Ordered folder chain from the root down to (and including) `folderId`.
 * Returns an empty array for a root-level item or an unknown id.
 */
export function buildFolderPath(
  folders: NoteFolder[],
  folderId: string | null,
): NoteFolder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: NoteFolder[] = [];
  const seen = new Set<string>();
  let current: string | null = folderId;
  while (current) {
    if (seen.has(current)) break; // cycle guard
    seen.add(current);
    const folder: NoteFolder | undefined = byId.get(current);
    if (!folder) break;
    path.unshift(folder);
    current = folder.parent_id;
  }
  return path;
}

/** Folder-name breadcrumb path for a note, e.g. ["Career", "Job Applications"]. */
export function folderPathNames(
  folders: NoteFolder[],
  folderId: string | null,
): string[] {
  return buildFolderPath(folders, folderId).map((f) => f.name);
}

export type MoveTarget = { id: string | null; name: string; depth: number };

/**
 * Flatten folders into an indented list suitable for a "Move to…" picker.
 * When `excludeSubtreeOf` is provided, that folder and all its descendants are
 * omitted so a folder can never be moved inside itself.
 */
export function flattenFoldersForMove(
  folders: NoteFolder[],
  excludeSubtreeOf?: string,
): MoveTarget[] {
  const excluded = new Set<string>();
  if (excludeSubtreeOf) {
    excluded.add(excludeSubtreeOf);
    for (const id of getDescendantFolderIds(folders, excludeSubtreeOf)) {
      excluded.add(id);
    }
  }

  const childrenOf = new Map<string, NoteFolder[]>();
  const byId = new Map(folders.map((f) => [f.id, f]));
  for (const f of folders) {
    const key = f.parent_id && byId.has(f.parent_id) ? f.parent_id : ROOT;
    const list = childrenOf.get(key);
    if (list) list.push(f);
    else childrenOf.set(key, [f]);
  }

  const out: MoveTarget[] = [{ id: null, name: "Root", depth: 0 }];
  const visited = new Set<string>();
  const walk = (parentKey: string, depth: number) => {
    const children = (childrenOf.get(parentKey) ?? []).slice().sort(compareFolders);
    for (const f of children) {
      if (excluded.has(f.id) || visited.has(f.id)) continue;
      visited.add(f.id);
      out.push({ id: f.id, name: f.name, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(ROOT, 1);
  return out;
}
