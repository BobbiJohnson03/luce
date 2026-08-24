"use client";

import { useState } from "react";
import Link from "next/link";
import type { LanguageProfile } from "@/lib/languages/types";
import { LanguageProfileDialog } from "./LanguageProfileDialog";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getLanguageDisplayName } from "@/lib/languages/catalog";

function levelSummary(
  profile: LanguageProfile,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (profile.current_cefr && profile.target_cefr) {
    return `${profile.current_cefr} → ${profile.target_cefr}`;
  }
  if (profile.current_cefr)
    return t("languages.currentLevel", { level: profile.current_cefr });
  if (profile.target_cefr)
    return t("languages.targetLevel", { level: profile.target_cefr });
  return t("languages.levelsNotSet");
}

export function LanguageHub({ profiles }: { profiles: LanguageProfile[] }) {
  const [adding, setAdding] = useState(false);
  const { locale, t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="animate-fade-up flex flex-col gap-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm tracking-[0.3em] text-muted">
            {t("languages.label")}
          </p>
          <h1 className="mt-3 text-4xl font-light tracking-tight sm:text-5xl">
            {t("languages.title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            {t("languages.description")}
          </p>
        </div>
        {profiles.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-fit rounded-full border border-border-strong px-5 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            + {t("languages.add")}
          </button>
        )}
      </div>

      {profiles.length === 0 ? (
        <section className="animate-fade-up rounded-2xl border border-border bg-surface/50 px-6 py-14 text-center sm:px-10 sm:py-20 [animation-delay:0.08s]">
          <p className="text-xs tracking-[0.25em] text-muted">
            {t("languages.space")}
          </p>
          <h2 className="mt-4 text-2xl font-light tracking-tight">
            {t("languages.empty")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {t("languages.emptyDescription")}
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-7 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {t("languages.add")}
          </button>
        </section>
      ) : (
        <div className="animate-fade-up divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40 [animation-delay:0.08s]">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/languages/${profile.id}`}
              className="group flex flex-col gap-5 px-5 py-5 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between sm:px-7"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="text-2xl font-light tracking-tight">
                    {getLanguageDisplayName(profile.language_code, locale)}
                  </h2>
                  <span className="text-sm text-muted-strong">
                    {levelSummary(profile, t)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {t("languages.primaryTranslation", {
                    language: getLanguageDisplayName(
                      profile.translation_language_code,
                      locale,
                    ),
                  })}
                  {profile.daily_goal_minutes
                    ? ` · ${t("languages.dailyMinutes", {
                        minutes: profile.daily_goal_minutes,
                      })}`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted transition-colors group-hover:text-foreground">
                {t("languages.continue")}
              </span>
            </Link>
          ))}
        </div>
      )}

      <LanguageProfileDialog
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}
