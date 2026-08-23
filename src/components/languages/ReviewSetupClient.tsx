"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startReviewSession } from "@/app/languages/[profileId]/review/actions";
import { useToast } from "@/components/notes/Toast";

export function ReviewSetupClient({
  profileId,
  dueCount,
  hasActiveSession,
  launchSource,
}: {
  profileId: string;
  dueCount: number;
  hasActiveSession: boolean;
  launchSource: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const nothingToDo = dueCount === 0 && !hasActiveSession;

  function start() {
    setError("");
    startTransition(async () => {
      const result = await startReviewSession(profileId, launchSource);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      router.push(`/languages/${profileId}/review/${result.sessionId}`);
    });
  }

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center py-12">
      <p className="text-xs tracking-[0.3em] text-muted">REVIEW</p>

      {nothingToDo ? (
        <>
          <h2 className="mt-6 text-3xl font-light tracking-tight">
            You&apos;re caught up.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Nothing is due for review right now. New and returning words will
            appear here when they&apos;re ready.
          </p>
          <Link
            href={`/languages/${profileId}/vocabulary`}
            className="mt-8 inline-block text-sm text-muted transition-colors hover:text-foreground"
          >
            Go to vocabulary →
          </Link>
        </>
      ) : (
        <>
          <h2 className="mt-6 text-4xl font-light tracking-tight tabular-nums">
            {dueCount} due
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {hasActiveSession
              ? "You have a review in progress. Continue where you left off."
              : `Estimated session size: ${dueCount}.`}
          </p>

          {error && (
            <p role="alert" className="mt-6 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={start}
              disabled={pending}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending
                ? "Starting…"
                : hasActiveSession
                  ? "Resume review"
                  : "Start review"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
