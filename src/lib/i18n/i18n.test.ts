import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, normalizeLocale } from "./locale";
import { dictionaries, en, pl, translate } from "./translations";

describe("interface localization", () => {
  it("keeps English and Polish dictionaries complete and identical in shape", () => {
    const englishKeys = Object.keys(en).sort();
    const polishKeys = Object.keys(pl).sort();
    expect(englishKeys.length).toBeGreaterThan(0);
    expect(polishKeys).toEqual(englishKeys);
    for (const locale of ["en", "pl"] as const) {
      for (const key of englishKeys) {
        expect(dictionaries[locale][key as keyof typeof en]).toBeTruthy();
      }
    }
  });

  it("accepts only supported locales", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("pl")).toBe("pl");
  });

  it("falls back to English for invalid or missing preferences", () => {
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale("it")).toBe("en");
  });

  it("interpolates representative dynamic messages", () => {
    expect(translate("en", "common.pageOf", { page: 2, total: 7 })).toBe(
      "Page 2 of 7",
    );
    expect(translate("pl", "common.pageOf", { page: 2, total: 7 })).toBe(
      "Strona 2 z 7",
    );
  });
});
