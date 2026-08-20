import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/Logo";
import { MenuOverlay } from "@/components/MenuOverlay";
import { SetupNotice } from "@/components/SetupNotice";
import { NotesShell } from "@/components/notes/NotesShell";
import type { NoteFolder, NoteSummary } from "@/lib/notes/types";

const MENU_ITEMS = [
  { label: "Panoramica", href: "/dashboard" },
  { label: "Calendario", href: "/dashboard#calendar" },
  { label: "To-do", href: "/dashboard#todos" },
  { label: "Note", href: "/notes" },
];

export default async function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: folders }, { data: notes }] = await Promise.all([
    supabase
      .from("note_folders")
      .select("id, name, parent_id, position, created_at, updated_at")
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("notes")
      .select("id, folder_id, title, is_pinned, position, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <div className="flex items-center gap-6">
          <MenuOverlay items={MENU_ITEMS} />
          <Logo href="/dashboard" />
        </div>
        <div className="flex items-center gap-5 text-sm text-muted">
          <span className="hidden sm:inline">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="transition-colors hover:text-foreground"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </header>

      <NotesShell
        folders={(folders as NoteFolder[]) ?? []}
        notes={(notes as NoteSummary[]) ?? []}
      >
        {children}
      </NotesShell>
    </div>
  );
}
