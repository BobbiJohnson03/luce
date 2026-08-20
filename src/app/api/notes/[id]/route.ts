import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSearchText } from "@/lib/notes/search";
import type { NoteContent } from "@/lib/notes/types";

/**
 * Lightweight autosave endpoint used by `navigator.sendBeacon` when the page is
 * being hidden/closed (a hard unload where an in-flight server action would be
 * cancelled). RLS still enforces ownership; the session travels via cookies.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { title?: string; content?: NoteContent };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const title = (body.title ?? "").trim() || "Untitled";
  const content = Array.isArray(body.content) ? body.content : [];

  const { error } = await supabase
    .from("notes")
    .update({
      title,
      content,
      search_text: buildSearchText(title, content),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
