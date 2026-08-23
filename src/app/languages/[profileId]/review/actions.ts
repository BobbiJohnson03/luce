"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  loadActiveReviewSession,
  loadDueReviewCards,
} from "@/lib/languages/srs/review-server";
import { AGAIN_MAX_REQUEUES, AGAIN_REQUEUE_OFFSET } from "@/lib/languages/srs/queue";
import { SCHEDULER_NAME, applyReview } from "@/lib/languages/srs/scheduler";
import {
  pickSrsCard,
  SRS_STATE_COLUMNS,
  type ReviewRating,
  type SrsStateRow,
} from "@/lib/languages/srs/types";

type AuthenticatedClient = Awaited<ReturnType<typeof createClient>>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Reuse an active session only while it is still fresh; older ones are retired
// so abandoned sittings don't linger forever.
const ACTIVE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type StartReviewResult =
  | { ok: true; sessionId: string; resumed: boolean }
  | { ok: false; error: string };

export type RecordReviewResult =
  | { ok: true; rowVersion: number; due: string }
  | { ok: false; code: "stale"; rowVersion: number }
  | { ok: false; code: "unavailable" | "error"; message: string };

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
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  return String(error.code);
}

function databaseMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }
  return String(error.message);
}

function isStaleVersionError(error: unknown) {
  return (
    databaseCode(error) === "40001" ||
    databaseMessage(error).includes("LUCE_STALE_VERSION")
  );
}

/**
 * Start (or resume) a scheduled review. If a fresh active session already
 * exists for the profile it is reused so refreshing or re-entering doesn't spawn
 * duplicates; stale ones are abandoned. Returns the session id to navigate to.
 */
export async function startReviewSession(
  profileId: string,
  launchSource: string,
): Promise<StartReviewResult> {
  try {
    const { supabase, userId } = await requireUser();
    if (!(await hasActiveProfile(supabase, userId, profileId))) {
      return { ok: false, error: "This language profile is unavailable." };
    }

    const existing = await loadActiveReviewSession(supabase, userId, profileId);
    if (existing) {
      const age = Date.now() - new Date(existing.started_at).getTime();
      if (age < ACTIVE_SESSION_MAX_AGE_MS) {
        return { ok: true, sessionId: existing.id, resumed: true };
      }
      await supabase
        .from("study_sessions")
        .update({ status: "abandoned", completed_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .eq("status", "active");
    }

    const due = await loadDueReviewCards(supabase, userId, profileId);
    if (due.length === 0) {
      return { ok: false, error: "You're caught up. Nothing is due right now." };
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        language_profile_id: profileId,
        session_kind: "scheduled_review",
        exercise_mode: "flashcard",
        launch_source: launchSource.slice(0, 60),
        status: "active",
        initial_item_count: due.length,
        configuration: {
          queue: due.map((card) => card.vocabularyItemId),
          again: { offset: AGAIN_REQUEUE_OFFSET, max: AGAIN_MAX_REQUEUES },
          scheduler: SCHEDULER_NAME,
        },
      })
      .select("id")
      .single();
    if (error) throw error;

    return { ok: true, sessionId: data.id, resumed: false };
  } catch (error) {
    console.error("Could not start review session:", error);
    return { ok: false, error: "The review session could not be started." };
  }
}

/**
 * Grade one card. The authoritative FSRS transition is computed here, on the
 * server, from the current stored scheduler state — never from client input.
 * The client only supplies the rating and (optionally) how long it took.
 * Persistence is atomic via the record_review RPC, which also enforces
 * ownership and optimistic concurrency.
 */
export async function recordReview(
  profileId: string,
  sessionId: string,
  vocabularyItemId: string,
  rating: ReviewRating,
  responseTimeMs: number | null,
): Promise<RecordReviewResult> {
  try {
    if (
      !UUID_PATTERN.test(profileId) ||
      !UUID_PATTERN.test(sessionId) ||
      !UUID_PATTERN.test(vocabularyItemId)
    ) {
      return { ok: false, code: "error", message: "Invalid review request." };
    }
    if (![1, 2, 3, 4].includes(rating)) {
      return { ok: false, code: "error", message: "Invalid rating." };
    }

    const { supabase, userId } = await requireUser();

    const { data: stateRow, error: stateError } = await supabase
      .from("vocabulary_srs_states")
      .select(SRS_STATE_COLUMNS)
      .eq("vocabulary_item_id", vocabularyItemId)
      .eq("user_id", userId)
      .eq("language_profile_id", profileId)
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stateRow) {
      return {
        ok: false,
        code: "unavailable",
        message: "This card is no longer available.",
      };
    }

    const state = stateRow as SrsStateRow;
    const now = new Date();
    const nextCard = applyReview(pickSrsCard(state), rating, now);

    const { data, error } = await supabase.rpc("record_review", {
      p_session_id: sessionId,
      p_vocabulary_item_id: vocabularyItemId,
      p_rating: rating,
      p_expected_version: state.row_version,
      p_resulting_state: nextCard,
      p_response_time_ms:
        responseTimeMs != null && responseTimeMs >= 0
          ? Math.round(responseTimeMs)
          : null,
      p_exercise_mode: "flashcard",
      p_affected_schedule: true,
      p_reviewed_at: now.toISOString(),
    });

    if (error) {
      if (isStaleVersionError(error)) {
        // Another attempt (e.g. a second tab) advanced this card first. Report
        // the fresh version so the client can regrade against current state
        // instead of silently overwriting it.
        const { data: fresh } = await supabase
          .from("vocabulary_srs_states")
          .select("row_version")
          .eq("vocabulary_item_id", vocabularyItemId)
          .eq("user_id", userId)
          .maybeSingle();
        return {
          ok: false,
          code: "stale",
          rowVersion: (fresh?.row_version as number | undefined) ?? state.row_version,
        };
      }
      throw error;
    }

    const result = (data ?? {}) as { row_version?: number; due?: string };
    return {
      ok: true,
      rowVersion: result.row_version ?? state.row_version + 1,
      due: result.due ?? nextCard.due,
    };
  } catch (error) {
    console.error("Could not record review:", error);
    return {
      ok: false,
      code: "error",
      message: "This answer could not be saved. Please try again.",
    };
  }
}

/** Mark a session complete once its queue is exhausted. */
export async function completeReviewSession(
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
      .eq("status", "active");
    if (error) throw error;

    revalidatePath(`/languages/${profileId}`);
    revalidatePath(`/languages/${profileId}/vocabulary`);
    revalidatePath(`/languages/${profileId}/review`);
    return { ok: true };
  } catch (error) {
    console.error("Could not complete review session:", error);
    return { ok: false };
  }
}
