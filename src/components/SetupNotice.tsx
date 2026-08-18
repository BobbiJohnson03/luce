import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Shown when Supabase isn't configured yet. Guides the user to add keys.
 */
export function SetupNotice() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-6 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
          <p className="text-xs tracking-[0.3em] text-muted">CONFIGURAZIONE</p>
          <h1 className="mt-3 text-2xl font-light">Podłącz Supabase</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Aby włączyć logowanie i zapisywanie danych, skopiuj{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-foreground">
              .env.example
            </code>{" "}
            do{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-foreground">
              .env.local
            </code>{" "}
            i wklej klucze z panelu Supabase (Project Settings → API), a następnie
            zrestartuj serwer.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Strona główna
          </Link>
        </div>
      </main>
    </div>
  );
}
