"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocalePreference } from "@/app/locale-actions";
import type { Locale } from "@/lib/i18n/locale";
import { useI18n } from "./I18nProvider";

export function LocaleSelector() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(nextLocale: Locale) {
    if (nextLocale === locale) return;
    startTransition(async () => {
      await setLocalePreference(nextLocale);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("locale.selectorLabel")}
      className="flex items-center gap-1 rounded-full border border-border p-1"
    >
      {(["en", "pl"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={locale === value}
          disabled={pending}
          onClick={() => select(value)}
          className={[
            "rounded-full px-3 py-1 text-xs transition-colors disabled:opacity-50",
            locale === value
              ? "bg-surface-2 text-foreground"
              : "text-muted hover:text-foreground",
          ].join(" ")}
        >
          {value === "en" ? "EN" : "PL"}
        </button>
      ))}
    </div>
  );
}
