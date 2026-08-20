import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/notes/types";
import { NoteEditorScreen } from "@/components/notes/NoteEditorScreen";

function NoteUnavailable() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-sm tracking-[0.2em] text-muted">404</p>
      <h1 className="mt-3 text-2xl font-light">This note is unavailable.</h1>
      <p className="mt-2 text-sm text-muted">
        It may have been deleted or does not belong to you.
      </p>
      <Link
        href="/notes"
        className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to Notes
      </Link>
    </div>
  );
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, folder_id, title, is_pinned, position, updated_at, created_at, content, search_text",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return <NoteUnavailable />;

  return (
    <Suspense fallback={null}>
      <NoteEditorScreen note={data as Note} />
    </Suspense>
  );
}
