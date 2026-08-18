import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BlobPlaceholder } from "@/components/BlobPlaceholder";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-border-strong px-4 py-1.5 text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* 3D placeholder sits behind the title, like the reference */}
        <div className="absolute inset-0 flex items-center justify-center">
          <BlobPlaceholder className="translate-y-[-6%]" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <p className="animate-fade-up text-sm tracking-[0.35em] text-muted [animation-delay:0.05s]">
            IL TUO CENTRO DI COMANDO
          </p>
          <h1 className="animate-fade-up mt-6 text-6xl font-light tracking-tight text-foreground sm:text-8xl [animation-delay:0.15s]">
            Luce
          </h1>
          <p className="animate-fade-up mt-8 max-w-md text-lg leading-relaxed text-muted-strong [animation-delay:0.3s]">
            Calendario, note e to-do in uno spazio calmo e minimale.
            <br />
            Everything that matters, in one quiet place.
          </p>
          <div className="animate-fade-up mt-12 flex items-center gap-4 [animation-delay:0.45s]">
            <Link
              href="/register"
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Create your space
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              I already have one →
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs tracking-wide text-muted sm:px-10 sm:text-left">
        Luce · dark by design
      </footer>
    </div>
  );
}
