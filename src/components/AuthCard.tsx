import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BlobPlaceholder } from "@/components/BlobPlaceholder";

/**
 * Shared minimalist shell for the login / register screens.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="px-6 py-6 sm:px-10">
        <Logo />
      </header>

      {/* faint ambient light in the background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
        <BlobPlaceholder className="max-w-[720px]" />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="animate-fade-up w-full max-w-sm">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-sm text-muted">{footer}</div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-6 text-xs tracking-wide text-muted sm:px-10">
        <Link href="/" className="transition-colors hover:text-foreground">
          ← Wróć na stronę główną
        </Link>
      </footer>
    </div>
  );
}
