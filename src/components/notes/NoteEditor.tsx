"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { PartialBlock } from "@blocknote/core";
import type { NoteContent } from "@/lib/notes/types";

/**
 * Thin BlockNote wrapper. Uses the default schema, which natively provides every
 * MVP block (paragraph, headings, bullet/numbered/check lists, quote, divider,
 * code block and table) plus the "/" slash menu and drag handles.
 *
 * The editor is uncontrolled: it is initialised once from `initialContent` and
 * reports changes upward via `onChange`. This is intentional so React re-renders
 * (e.g. sidebar revalidations) never reset the user's in-progress editing.
 */
export function NoteEditor({
  initialContent,
  onChange,
}: {
  initialContent: NoteContent;
  onChange: (blocks: NoteContent) => void;
}) {
  const editor = useCreateBlockNote({
    // BlockNote rejects an empty array; use undefined to start with a blank doc.
    initialContent:
      initialContent && initialContent.length > 0
        ? (initialContent as PartialBlock[])
        : undefined,
  });

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      onChange={() => onChange(editor.document as NoteContent)}
      className="luce-blocknote"
    />
  );
}
