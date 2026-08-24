import type { SessionSummary } from "@/lib/languages/srs/summary";
import { SessionSummaryView } from "./SessionSummaryView";

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
  return (
    <SessionSummaryView
      title="PRACTICE COMPLETE"
      summary={summary}
      durationMs={durationMs}
      profileId={profileId}
      meta={[
        { label: "MODE", value: modeLabel },
        { label: "SCOPE", value: scopeLabel },
      ]}
    />
  );
}
