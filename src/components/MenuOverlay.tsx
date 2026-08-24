"use client";

import { useEffect, useState } from "react";
import {
  useTheme,
  type ThemePreference,
} from "@/components/theme/ThemeProvider";
import { useI18n } from "@/components/i18n/I18nProvider";

type Item = { label: string; href: string };

function AppearanceControl() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const options: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("appearance.system") },
    { value: "light", label: t("appearance.light") },
    { value: "dark", label: t("appearance.dark") },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs tracking-[0.25em] text-muted">
        {t("appearance.label")}
      </span>
      <div
        role="radiogroup"
        aria-label={t("appearance.aria")}
        className="flex items-center gap-1 rounded-full border border-border p-1"
      >
        {options.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(option.value)}
              className={[
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Centered full-screen menu overlay, echoing the reference site's navigation.
 * Opens from a minimal button; links scroll to dashboard sections.
 */
export function MenuOverlay({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

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
        aria-label={t("menu.open")}
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
              aria-label={t("menu.close")}
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

          <div className="flex justify-center px-6 pb-12 sm:pb-16">
            <AppearanceControl />
          </div>
        </div>
      )}
    </>
  );
}
