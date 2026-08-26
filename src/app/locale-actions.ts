"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/locale";

export async function setLocalePreference(locale: Locale) {
  const normalized = normalizeLocale(locale);
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, normalized, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
