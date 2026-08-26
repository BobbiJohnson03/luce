import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/Logo";
import { MenuOverlay } from "@/components/MenuOverlay";
import { SetupNotice } from "@/components/SetupNotice";
import { NotesShell } from "@/components/notes/NotesShell";
import type { NoteFolder, NoteSummary } from "@/lib/notes/types";
import { getI18n } from "@/lib/i18n/server";

export default async function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getI18n();
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const menuItems = [
    {
      id: "overview" as const,
      label: t("menu.overview"),
      href: "/dashboard",
    },
    {
      id: "calendar" as const,
      label: t("menu.calendar"),
      href: "/dashboard#calendar",
    },
    { id: "tasks" as const, label: t("menu.todos"), href: "/dashboard#todos" },
    { id: "notes" as const, label: t("menu.notes"), href: "/notes" },
    {
      id: "languages" as const,
      label: t("menu.languages"),
      href: "/languages",
    },
  ];

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
          <MenuOverlay items={menuItems} />
          <Logo href="/dashboard" />
        </div>
        <div className="flex items-center gap-5 text-sm text-muted">
          <span className="hidden sm:inline">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="transition-colors hover:text-foreground"
            >
              {t("menu.signOut")}
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
