"use client";

import type { SessionSummary } from "@/lib/languages/srs/summary";
import { SessionSummaryView } from "./SessionSummaryView";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Scheduled-review summary. Thin wrapper over the shared summary view. */
export function ReviewSummary({
  summary,
  durationMs,
  profileId,
}: {
  summary: SessionSummary;
  durationMs: number | null;
  profileId: string;
}) {
  const { t } = useI18n();
  return (
    <SessionSummaryView
      title={t("review.complete")}
      summary={summary}
      durationMs={durationMs}
      profileId={profileId}
    />
  );
}
