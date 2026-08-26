import { redirect } from "next/navigation";
import { LanguageHub } from "@/components/languages/LanguageHub";
import { createClient } from "@/lib/supabase/server";
import type { LanguageProfile } from "@/lib/languages/types";
import { getI18n } from "@/lib/i18n/server";

const PROFILE_COLUMNS =
  "id, user_id, language_code, language_name, translation_language_code, translation_language_name, current_cefr, target_cefr, daily_goal_minutes, position, archived_at, created_at, updated_at";

export default async function LanguagesPage() {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("language_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load language profiles:", error);
    return (
      <div className="mx-auto w-full max-w-3xl py-16">
        <p className="text-xs tracking-[0.25em] text-muted">
          {t("languages.label")}
        </p>
        <h1 className="mt-4 text-2xl font-light">
          {t("languages.unavailable")}
        </h1>
        <p className="mt-3 text-sm text-muted">{t("common.tryAgain")}</p>
      </div>
    );
  }

  return <LanguageHub profiles={(data as LanguageProfile[]) ?? []} />;
}
