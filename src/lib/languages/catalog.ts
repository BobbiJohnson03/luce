export type LanguageOption = {
  code: string;
  name: string;
};

/**
 * Deliberately small, dependency-free catalog for profile onboarding. Codes
 * use the lowercase form persisted by the language_profiles normalization
 * trigger. Additions stay centralized as Luce expands its language support.
 */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "zh", name: "Chinese" },
  { code: "cs", name: "Czech" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" },
  { code: "uk", name: "Ukrainian" },
];

export function getLanguageOption(code: string): LanguageOption | null {
  const normalized = code.trim().toLowerCase();
  return LANGUAGE_OPTIONS.find((language) => language.code === normalized) ?? null;
}
