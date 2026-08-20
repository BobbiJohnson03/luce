import type { NoteContent } from "./types";

/**
 * Inline content nodes in a BlockNote document are either styled text runs
 * ({ type: "text", text }) or links (which carry nested `content`). Tables use a
 * dedicated { type: "tableContent", rows: [{ cells: [...] }] } shape. We only
 * care about the readable text, so this walks whatever shape it finds.
 */
type InlineNode = {
  type?: string;
  text?: string;
  content?: unknown;
  rows?: Array<{ cells?: unknown }>;
};

function collectInline(node: unknown, out: string[]): void {
  if (node == null) return;

  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) collectInline(child, out);
    return;
  }

  if (typeof node === "object") {
    const n = node as InlineNode;
    if (typeof n.text === "string" && n.text.trim()) out.push(n.text);
    // Table cell content lives under rows[].cells[].content
    if (Array.isArray(n.rows)) {
      for (const row of n.rows) collectInline(row?.cells, out);
    }
    if (n.content != null) collectInline(n.content, out);
  }
}

type BlockLike = {
  content?: unknown;
  children?: unknown;
};

/**
 * Convert block-editor JSON into a flat, human-readable string used to populate
 * the `search_text` column. Includes text from headings, paragraphs, list items,
 * checklist items, quotes, code blocks and table cells; ignores block metadata.
 *
 * Kept UI-free and pure so it can run on the server (on save) and be unit tested.
 */
export function extractPlainText(content: NoteContent | unknown): string {
  const out: string[] = [];

  const walkBlocks = (blocks: unknown) => {
    if (!Array.isArray(blocks)) return;
    for (const block of blocks) {
      if (!block || typeof block !== "object") continue;
      const b = block as BlockLike;
      collectInline(b.content, out);
      if (Array.isArray(b.children)) walkBlocks(b.children);
    }
  };

  walkBlocks(content);

  return out
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the value stored in `search_text`: the title plus the note body, so a
 * query can match either. Kept in one place so save paths stay consistent.
 */
export function buildSearchText(
  title: string,
  content: NoteContent | unknown,
): string {
  return `${title} ${extractPlainText(content)}`.replace(/\s+/g, " ").trim();
}
