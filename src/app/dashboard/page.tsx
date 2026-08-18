import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/Logo";
import { SetupNotice } from "@/components/SetupNotice";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-6 sm:px-10">
        <Logo href="/dashboard" />
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

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="animate-fade-up text-sm tracking-[0.3em] text-muted">
          CENTRO DI COMANDO
        </p>
        <h1 className="animate-fade-up mt-4 text-4xl font-light tracking-tight sm:text-5xl [animation-delay:0.1s]">
          Ciao 👋
        </h1>
        <p className="animate-fade-up mt-4 max-w-md text-muted [animation-delay:0.2s]">
          Kalendarz i to-do listy pojawią się tutaj w kolejnych etapach.
        </p>
      </main>
    </div>
  );
}
