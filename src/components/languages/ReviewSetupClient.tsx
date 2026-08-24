"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startReviewSession } from "@/app/languages/[profileId]/review/actions";
import { useToast } from "@/components/notes/Toast";
import { useI18n } from "@/components/i18n/I18nProvider";

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
  const { t } = useI18n();
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
      <p className="text-xs tracking-[0.3em] text-muted">{t("review.label")}</p>

      {nothingToDo ? (
        <>
          <h2 className="mt-6 text-3xl font-light tracking-tight">
            {t("review.caughtUp")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t("review.caughtUpDescription")}
          </p>
          <Link
            href={`/languages/${profileId}/vocabulary`}
            className="mt-8 inline-block text-sm text-muted transition-colors hover:text-foreground"
          >
            {t("review.goVocabulary")}
          </Link>
        </>
      ) : (
        <>
          <h2 className="mt-6 text-4xl font-light tracking-tight tabular-nums">
            {t("review.due", { count: dueCount })}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {hasActiveSession
              ? t("review.resumeDescription")
              : t("review.estimated", { count: dueCount })}
          </p>

          {error && (
            <p role="alert" className="mt-6 text-sm text-danger">
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
                ? t("review.starting")
                : hasActiveSession
                  ? t("review.resume")
                  : t("review.start")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
