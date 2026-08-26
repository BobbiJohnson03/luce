"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { loadActiveVocabularyIds } from "@/lib/languages/srs/practice-server";
import {
  buildPracticePlan,
  isPracticeMode,
  isPracticeSize,
  practiceRpcArgs,
  type PracticeDirection,
  type PracticeMode,
  type PracticeSize,
} from "@/lib/languages/srs/practice";
import { AGAIN_MAX_REQUEUES, AGAIN_REQUEUE_OFFSET } from "@/lib/languages/srs/queue";
import type { ReviewRating } from "@/lib/languages/srs/types";

type AuthenticatedClient = Awaited<ReturnType<typeof createClient>>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StartPracticeResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

export type RecordPracticeResult =
  | { ok: true }
  | { ok: false; code: "stale" | "unavailable" | "error"; message?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

async function hasActiveProfile(
  supabase: AuthenticatedClient,
  userId: string,
  profileId: string,
) {
  if (!UUID_PATTERN.test(profileId)) return false;
  const { data, error } = await supabase
    .from("language_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function databaseCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return String(error.code);
}

function databaseMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("message" in error)) return "";
  return String(error.message);
}

function isStaleVersionError(error: unknown) {
  return (
    databaseCode(error) === "40001" ||
    databaseMessage(error).includes("LUCE_STALE_VERSION")
  );
}

/**
 * Create a practice session. The plan (ordered items + per-card direction) is
 * persisted in configuration so the exact session resumes after a refresh.
 */
export async function startPracticeSession(
  profileId: string,
  mode: PracticeMode,
  size: PracticeSize,
  topicId: string | null,
): Promise<StartPracticeResult> {
  try {
    const { t } = await getI18n();
    if (!isPracticeMode(mode) || !isPracticeSize(size)) {
      return { ok: false, error: t("practice.errorInvalidOptions") };
    }
    if (topicId && !UUID_PATTERN.test(topicId)) {
      return { ok: false, error: t("practice.errorInvalidTopic") };
    }

    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: t("languages.profileUnavailable") };
    }

    const ids = await loadActiveVocabularyIds(supabase, userId, profileId, topicId);
    const plan = buildPracticePlan(ids, mode, size);
    if (plan.length === 0) {
      return {
        ok: false,
        error: topicId
          ? t("practice.errorEmptyTopic")
          : t("practice.errorEmpty"),
      };
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        language_profile_id: profileId,
        session_kind: "practice",
        exercise_mode: mode,
        launch_source: topicId ? "topic" : "practice",
        status: "active",
        initial_item_count: plan.length,
        configuration: {
          mode,
          scope: { type: topicId ? "topic" : "all", topicId: topicId ?? null },
          plan,
          again: { offset: AGAIN_REQUEUE_OFFSET, max: AGAIN_MAX_REQUEUES },
        },
      })
      .select("id")
      .single();
    if (error) throw error;

    return { ok: true, sessionId: data.id };
  } catch (error) {
    console.error("Could not start practice session:", error);
    const { t } = await getI18n();
    return { ok: false, error: t("practice.errorStart") };
  }
}

async function recordOnce(
  supabase: AuthenticatedClient,
  userId: string,
  profileId: string,
  sessionId: string,
  vocabularyItemId: string,
  rating: ReviewRating,
  direction: PracticeDirection,
  responseTimeMs: number | null,
): Promise<{ status: "ok" } | { status: "stale" } | { status: "missing" } | { status: "throw"; error: unknown }> {
  const { data: stateRow, error: stateError } = await supabase
    .from("vocabulary_srs_states")
    .select("row_version")
    .eq("vocabulary_item_id", vocabularyItemId)
    .eq("user_id", userId)
    .eq("language_profile_id", profileId)
    .maybeSingle();
  if (stateError) return { status: "throw", error: stateError };
  if (!stateRow) return { status: "missing" };

  const { error } = await supabase.rpc(
    "record_review",
    practiceRpcArgs({
      sessionId,
      vocabularyItemId,
      rating,
      expectedVersion: stateRow.row_version as number,
      direction,
      responseTimeMs,
      reviewedAt: new Date().toISOString(),
    }),
  );
  if (error) {
    if (isStaleVersionError(error)) return { status: "stale" };
    return { status: "throw", error };
  }
  return { status: "ok" };
}

/**
 * Persist one practice attempt. Always writes with affected_schedule = false
 * (enforced server-side via practiceRpcArgs), so FSRS state is never touched.
 * The optimistic-version check only matters for scheduled review, so a rare
 * conflict from a concurrent review is retried once before surfacing.
 */
export async function recordPracticeAttempt(
  profileId: string,
  sessionId: string,
  vocabularyItemId: string,
  rating: ReviewRating,
  direction: PracticeDirection,
  responseTimeMs: number | null,
): Promise<RecordPracticeResult> {
  try {
    const { t } = await getI18n();
    if (
      !UUID_PATTERN.test(profileId) ||
      !UUID_PATTERN.test(sessionId) ||
      !UUID_PATTERN.test(vocabularyItemId)
    ) {
      return {
        ok: false,
        code: "error",
        message: t("practice.errorInvalidRequest"),
      };
    }
    if (![1, 2, 3, 4].includes(rating)) {
      return {
        ok: false,
        code: "error",
        message: t("practice.errorInvalidRating"),
      };
    }
    if (direction !== "recall" && direction !== "reverse") {
      return {
        ok: false,
        code: "error",
        message: t("practice.errorInvalidDirection"),
      };
    }

    const { supabase, userId } = await requireUser();

    let attempt = await recordOnce(
      supabase,
      userId,
      profileId,
      sessionId,
      vocabularyItemId,
      rating,
      direction,
      responseTimeMs,
    );
    // Practice doesn't change scheduling, so a version conflict is spurious
    // (a concurrent review bumped the row). Retry once against fresh state.
    if (attempt.status === "stale") {
      attempt = await recordOnce(
        supabase,
        userId,
        profileId,
        sessionId,
        vocabularyItemId,
        rating,
        direction,
        responseTimeMs,
      );
    }

    if (attempt.status === "ok") return { ok: true };
    if (attempt.status === "missing") {
      return {
        ok: false,
        code: "unavailable",
        message: t("practice.errorUnavailable"),
      };
    }
    if (attempt.status === "stale") {
      return { ok: false, code: "stale" };
    }
    throw attempt.error;
  } catch (error) {
    console.error("Could not record practice attempt:", error);
    const { t } = await getI18n();
    return {
      ok: false,
      code: "error",
      message: t("practice.errorSave"),
    };
  }
}

/** Mark a practice session complete once its queue is exhausted. */
export async function completePracticeSession(
  profileId: string,
  sessionId: string,
  durationMs: number | null,
): Promise<{ ok: boolean }> {
  try {
    if (!UUID_PATTERN.test(profileId) || !UUID_PATTERN.test(sessionId)) {
      return { ok: false };
    }
    const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from("study_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_ms:
          durationMs != null && durationMs >= 0 ? Math.round(durationMs) : null,
      })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .eq("session_kind", "practice")
      .eq("status", "active");
    if (error) throw error;

    revalidatePath(`/languages/${profileId}`);
    revalidatePath(`/languages/${profileId}/practice`);
    revalidatePath(`/languages/${profileId}/vocabulary`);
    return { ok: true };
  } catch (error) {
    console.error("Could not complete practice session:", error);
    return { ok: false };
  }
}
