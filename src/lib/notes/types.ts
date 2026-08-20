import type { Block } from "@blocknote/core";

/**
 * A single node in a BlockNote document. The database stores the note body as a
 * JSONB array of these blocks, so structure (headings, tables, checklists, ...)
 * is preserved rather than flattened to HTML/Markdown.
 */
export type NoteContent = Block[];

/** A notes folder. Mirrors the `note_folders` table (snake_case columns). */
export type NoteFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

/**
 * Lightweight note representation used to render the sidebar tree, pinned list
 * and search results without loading the (potentially large) JSONB body.
 */
export type NoteSummary = {
  id: string;
  folder_id: string | null;
  title: string;
  is_pinned: boolean;
  position: number;
  updated_at: string;
};

/** A fully loaded note, including its editor content. */
export type Note = NoteSummary & {
  content: NoteContent;
  search_text: string;
  created_at: string;
};

/** A folder with its resolved children, used to render the recursive tree. */
export type FolderNode = {
  folder: NoteFolder;
  folders: FolderNode[];
  notes: NoteSummary[];
};

/** The full resolved notes tree: root-level folders and root-level notes. */
export type NotesTree = {
  folders: FolderNode[];
  notes: NoteSummary[];
};

/** A search hit, carrying enough context to render a breadcrumb path. */
export type NoteSearchResult = {
  note: NoteSummary;
  path: string[];
};
