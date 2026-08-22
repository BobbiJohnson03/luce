import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/Logo";
import { MenuOverlay } from "@/components/MenuOverlay";
import { SetupNotice } from "@/components/SetupNotice";
import { ToastProvider } from "@/components/notes/Toast";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MENU_ITEMS = [
  { label: "Panoramica", href: "/dashboard" },
  { label: "Calendario", href: "/dashboard#calendar" },
  { label: "To-do", href: "/dashboard#todos" },
  { label: "Note", href: "/notes" },
  { label: "Languages", href: "/languages" },
];

export default async function LanguagesLayout({
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

  return (
    <ToastProvider>
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none fixed inset-0 -z-10 flex items-start justify-center opacity-20">
          <div className="mt-[-10%] aspect-square w-[70vw] max-w-[900px] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
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

        <main className="flex-1 px-6 pb-16 sm:px-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
