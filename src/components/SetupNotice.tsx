import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getI18n } from "@/lib/i18n/server";

/**
 * Shown when Supabase isn't configured yet. Guides the user to add keys.
 */
export async function SetupNotice() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-6 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
          <p className="text-xs tracking-[0.3em] text-muted">
            {t("setup.eyebrow")}
          </p>
          <h1 className="mt-3 text-2xl font-light">{t("setup.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t("setup.description", {
              example: ".env.example",
              local: ".env.local",
            })}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
          >
            {t("setup.home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
