import "server-only";

import { cookies } from "next/headers";
import { localeTag, LOCALE_COOKIE, normalizeLocale } from "./locale";
import { translate, type TranslationKey, type TranslationParams } from "./translations";

export async function getLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export async function getI18n() {
  const locale = await getLocale();
  return {
    locale,
    localeTag: localeTag(locale),
    t: (key: TranslationKey, params?: TranslationParams) =>
      translate(locale, key, params),
  };
}
