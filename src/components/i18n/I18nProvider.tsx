"use client";

import { createContext, useContext, useMemo } from "react";
import { localeTag, type Locale } from "@/lib/i18n/locale";
import {
  translate,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n/translations";

type I18nApi = {
  locale: Locale;
  localeTag: string;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const api = useMemo<I18nApi>(() => {
    const tag = localeTag(locale);
    return {
      locale,
      localeTag: tag,
      t: (key, params) => translate(locale, key, params),
      formatDate: (value, options) =>
        new Intl.DateTimeFormat(tag, options).format(new Date(value)),
      formatNumber: (value, options) =>
        new Intl.NumberFormat(tag, options).format(value),
    };
  }, [locale]);

  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
