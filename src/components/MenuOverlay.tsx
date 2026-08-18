"use client";

import { useEffect, useState } from "react";

type Item = { label: string; href: string };

/**
 * Centered full-screen menu overlay, echoing the reference site's navigation.
 * Opens from a minimal button; links scroll to dashboard sections.
 */
export function MenuOverlay({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Otwórz menu"
        className="flex flex-col gap-1.5 p-1 text-muted transition-colors hover:text-foreground"
      >
        <span className="block h-px w-6 bg-current" />
        <span className="block h-px w-6 bg-current" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-end px-6 py-6 sm:px-10">
            <button
              onClick={() => setOpen(false)}
              aria-label="Zamknij menu"
              className="p-1 text-muted transition-colors hover:text-foreground"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M4 4l14 14M18 4L4 18"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-6">
            {items.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="animate-fade-up text-2xl font-light tracking-tight text-muted transition-colors hover:text-foreground sm:text-3xl"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
