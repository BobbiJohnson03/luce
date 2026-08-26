import Link from "next/link";
import { LanguageProfileActions } from "@/components/languages/LanguageProfileActions";
import { LanguageProfileNav } from "@/components/languages/LanguageProfileNav";
import { loadLanguageProfile } from "@/lib/languages/server";
import type { LanguageProfile } from "@/lib/languages/types";
import { getI18n } from "@/lib/i18n/server";
import { getLanguageDisplayName } from "@/lib/languages/catalog";

function levelSummary(profile: LanguageProfile, notSet: string): string {
  if (profile.current_cefr && profile.target_cefr) {
    return `${profile.current_cefr} → ${profile.target_cefr}`;
  }
  return profile.current_cefr ?? profile.target_cefr ?? notSet;
}

async function ProfileUnavailable() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto w-full max-w-3xl py-16">
      <p className="text-xs tracking-[0.25em] text-muted">
        {t("languages.label")}
      </p>
      <h1 className="mt-4 text-2xl font-light">
        {t("languages.profileUnavailable")}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {t("languages.profileUnavailableDescription")}
      </p>
      <Link
        href="/languages"
        className="mt-6 inline-block text-sm text-muted transition-colors hover:text-foreground"
      >
        {t("languages.back")}
      </Link>
    </div>
  );
}

export default async function LanguageProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const { locale, t } = await getI18n();
  const { profile } = await loadLanguageProfile(profileId);
  if (!profile) return <ProfileUnavailable />;
  const languageName = getLanguageDisplayName(profile.language_code, locale);
  const translationLanguageName = getLanguageDisplayName(
    profile.translation_language_code,
    locale,
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="animate-fade-up py-6 sm:py-8">
        <Link
          href="/languages"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          {t("languages.back")}
        </Link>
        <p className="mt-8 text-sm tracking-[0.3em] text-muted">
          {languageName.toLocaleUpperCase(locale)}
        </p>
        <div className="mt-3">
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">
            {languageName}
          </h1>
          <p className="mt-3 text-sm text-muted-strong">
            {languageName} → {translationLanguageName}
            {(profile.current_cefr || profile.target_cefr) &&
              ` · ${levelSummary(profile, t("common.notSet"))}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
        <div className="overflow-x-auto">
          <LanguageProfileNav profileId={profile.id} />
        </div>
        <div className="pb-3">
          <LanguageProfileActions profile={profile} />
        </div>
      </div>

      {children}
    </div>
  );
}
