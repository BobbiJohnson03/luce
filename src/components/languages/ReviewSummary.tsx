import Link from "next/link";
import type { SessionSummary } from "@/lib/languages/srs/summary";

function formatDuration(ms: number | null): string | null {
  if (ms == null || ms < 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  const minutes = Math.round(totalSeconds / 60);
  return `${minutes} min`;
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dd className="text-2xl font-light tabular-nums">{value}</dd>
      <dt className="mt-1 text-xs tracking-[0.16em] text-muted">{label}</dt>
    </div>
  );
}

/**
 * Restrained end-of-session summary. Every figure comes from real recorded
 * attempts. Cards and attempts are shown separately so requeues are visible,
 * and accuracy is measured over first-pass results (never exceeds 100%).
 */
export function ReviewSummary({
  summary,
  durationMs,
  profileId,
}: {
  summary: SessionSummary;
  durationMs: number | null;
  profileId: string;
}) {
  const duration = formatDuration(durationMs);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col justify-center py-16">
      <p className="text-xs tracking-[0.3em] text-muted">SESSION COMPLETE</p>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
        <Metric value={summary.cards} label="CARDS" />
        <Metric value={summary.attempts} label="ATTEMPTS" />
        <Metric value={summary.firstPassRemembered} label="FIRST-PASS" />
        <Metric value={summary.again} label="AGAIN" />
        {duration && (
          <div>
            <dd className="text-2xl font-light tabular-nums">{duration}</dd>
            <dt className="mt-1 text-xs tracking-[0.16em] text-muted">TIME</dt>
          </div>
        )}
      </dl>

      <div className="mt-10 border-t border-border pt-8">
        <p className="text-xs tracking-[0.16em] text-muted">ACCURACY</p>
        <p className="mt-2 text-4xl font-light tabular-nums">
          {summary.accuracy}%
        </p>
      </div>

      <div className="mt-10">
        <Link
          href={`/languages/${profileId}`}
          className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Done
        </Link>
      </div>
    </div>
  );
}
