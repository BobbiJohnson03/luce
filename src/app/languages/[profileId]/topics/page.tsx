import { TopicsPageClient } from "@/components/languages/TopicsPageClient";
import {
  LANGUAGE_TOPIC_COLUMNS,
  loadLanguageProfile,
} from "@/lib/languages/server";
import type { LanguageTopic } from "@/lib/languages/types";
import { getI18n } from "@/lib/i18n/server";

export default async function TopicsPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const { t } = await getI18n();
  const { supabase, userId, profile } = await loadLanguageProfile(profileId);
  if (!profile) return null;

  const { data, error } = await supabase
    .from("language_topics")
    .select(LANGUAGE_TOPIC_COLUMNS)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Could not load language topics:", error);
    return (
      <div className="py-12">
        <p className="text-xs tracking-[0.25em] text-muted">
          {t("topics.label")}
        </p>
        <h2 className="mt-4 text-2xl font-light">
          {t("topics.unavailable")}
        </h2>
        <p className="mt-3 text-sm text-muted">{t("common.tryAgain")}</p>
      </div>
    );
  }

  return (
    <TopicsPageClient
      profileId={profileId}
      topics={(data as LanguageTopic[] | null) ?? []}
    />
  );
}
