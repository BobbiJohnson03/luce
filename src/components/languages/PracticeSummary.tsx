"use client";

import type { SessionSummary } from "@/lib/languages/srs/summary";
import { SessionSummaryView } from "./SessionSummaryView";
import { useI18n } from "@/components/i18n/I18nProvider";

/**
 * Practice summary. Shows the same real metrics as review plus the practice
 * Mode and Scope. Deliberately shows no scheduling/due-date information, because
 * practice never affects FSRS.
 */
export function PracticeSummary({
  summary,
  durationMs,
  profileId,
  modeLabel,
  scopeLabel,
}: {
  summary: SessionSummary;
  durationMs: number | null;
  profileId: string;
  modeLabel: string;
  scopeLabel: string;
}) {
  const { t } = useI18n();
  return (
    <SessionSummaryView
      title={t("practice.complete")}
      summary={summary}
      durationMs={durationMs}
      profileId={profileId}
      meta={[
        { label: t("practice.mode"), value: modeLabel },
        { label: t("practice.scope"), value: scopeLabel },
      ]}
    />
  );
}
