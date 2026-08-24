import type { SessionSummary } from "@/lib/languages/srs/summary";
import { SessionSummaryView } from "./SessionSummaryView";

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
  return (
    <SessionSummaryView
      title="SESSION COMPLETE"
      summary={summary}
      durationMs={durationMs}
      profileId={profileId}
    />
  );
}
