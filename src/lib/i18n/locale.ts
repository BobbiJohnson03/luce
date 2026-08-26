export const SUPPORTED_LOCALES = ["en", "pl"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "luce_locale";

export function normalizeLocale(value: unknown): Locale {
  return value === "pl" || value === "en" ? value : DEFAULT_LOCALE;
}

export function localeTag(locale: Locale) {
  return locale === "pl" ? "pl-PL" : "en-US";
}
