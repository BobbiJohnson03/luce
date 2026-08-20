"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildSearchText } from "@/lib/notes/search";
import type {
  Note,
  NoteContent,
  NoteFolder,
  NoteSummary,
} from "@/lib/notes/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  return { ok: false, error: message };
}

// ── Folders ─────────────────────────────────────────────────────────────────
export async function createFolder(
  name: string,
  parentId: string | null,
): Promise<ActionResult<NoteFolder>> {
  try {
    const { supabase, user } = await requireUser();
    const clean = name.trim() || "Untitled folder";
    const { data, error } = await supabase
      .from("note_folders")
      .insert({ user_id: user.id, name: clean, parent_id: parentId })
      .select("id, name, parent_id, position, created_at, updated_at")
      .single();
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true, data: data as NoteFolder };
  } catch (e) {
    return fail(e);
  }
}

export async function renameFolder(
  id: string,
  name: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const clean = name.trim() || "Untitled folder";
    const { error } = await supabase
      .from("note_folders")
      .update({ name: clean })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveFolder(
  id: string,
  parentId: string | null,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    // The database trigger also rejects cycles / cross-user parents; this is a
    // fast client-facing guard for the obvious self-parent case.
    if (parentId === id) throw new Error("A folder cannot contain itself.");
    const { error } = await supabase
      .from("note_folders")
      .update({ parent_id: parentId })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteFolder(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    // ON DELETE CASCADE removes nested folders and their notes at the DB level.
    const { error } = await supabase.from("note_folders").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Notes ─────────────────────────────────────────────────────────────────
export async function createNote(
  title: string,
  folderId: string | null,
): Promise<ActionResult<NoteSummary>> {
  try {
    const { supabase, user } = await requireUser();
    const clean = title.trim() || "Untitled";
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        folder_id: folderId,
        title: clean,
        content: [],
        search_text: clean,
      })
      .select("id, folder_id, title, is_pinned, position, updated_at")
      .single();
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true, data: data as NoteSummary };
  } catch (e) {
    return fail(e);
  }
}

export async function renameNote(
  id: string,
  title: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const clean = title.trim() || "Untitled";
    const { error } = await supabase
      .from("notes")
      .update({ title: clean })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveNote(
  id: string,
  folderId: string | null,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("notes")
      .update({ folder_id: folderId })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function togglePin(
  id: string,
  isPinned: boolean,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("notes")
      .update({ is_pinned: isPinned })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/notes", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Search the user's notes by title and by the derived plain-text projection of
 * their content (search_text). Uses ILIKE for a simple, index-friendly MVP that
 * can later be upgraded to Postgres full-text search over the same column.
 */
export async function searchNotes(
  query: string,
): Promise<ActionResult<NoteSummary[]>> {
  try {
    const q = query.trim();
    if (!q) return { ok: true, data: [] };
    const { supabase } = await requireUser();
    // The PostgREST `or` filter treats commas, dots and parentheses as syntax,
    // so wrap the pattern in double quotes and escape quotes/backslashes. This
    // lets arbitrary query text (e.g. "DGS / WE.DO, EY") be matched safely.
    const safe = q.replace(/["\\]/g, (m) => `\\${m}`);
    const pattern = `"%${safe}%"`;
    const { data, error } = await supabase
      .from("notes")
      .select("id, folder_id, title, is_pinned, position, updated_at")
      .or(`title.ilike.${pattern},search_text.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return { ok: true, data: (data as NoteSummary[]) ?? [] };
  } catch (e) {
    return fail(e);
  }
}

/** Load a single note (with content) for the editor. */
export async function getNote(id: string): Promise<ActionResult<Note>> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("notes")
      .select(
        "id, folder_id, title, is_pinned, position, updated_at, created_at, content, search_text",
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    return { ok: true, data: data as Note };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Autosave path for the editor. Deliberately does NOT call revalidatePath: the
 * heavy note body is client-owned while editing, so we avoid re-fetching the
 * whole tree on every debounced keystroke. Title/pin/structure changes use the
 * dedicated actions above (which do revalidate) to keep the sidebar in sync.
 */
export async function saveNoteContent(
  id: string,
  title: string,
  content: NoteContent,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const cleanTitle = title.trim() || "Untitled";
    const { error } = await supabase
      .from("notes")
      .update({
        title: cleanTitle,
        content,
        search_text: buildSearchText(cleanTitle, content),
      })
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
