/**
 * Practice planning — pure, framework-free, unit-tested logic.
 *
 * Practice is voluntary extra study that records history but must NEVER change
 * FSRS scheduling. This module builds a stable, deterministic practice plan
 * (order + per-card direction) that is persisted in study_sessions.configuration
 * so a refresh resumes the exact same session, and constructs the RPC arguments
 * that hard-code affected_schedule = false.
 */
import type { ReviewRating, SrsCard } from "./types";

export type PracticeMode = "recall" | "reverse" | "mixed";
export type PracticeDirection = "recall" | "reverse";
export type PracticeSize = 10 | 20 | "all";

export const PRACTICE_MODES: PracticeMode[] = ["recall", "reverse", "mixed"];
export const PRACTICE_SIZE_OPTIONS: PracticeSize[] = [10, 20, "all"];

/** Safety cap for an "all" practice session in a single browser sitting. */
export const MAX_PRACTICE_SESSION_SIZE = 200;

export interface PracticePlanEntry {
  itemId: string;
  direction: PracticeDirection;
}

export function isPracticeMode(value: unknown): value is PracticeMode {
  return value === "recall" || value === "reverse" || value === "mixed";
}

export function isPracticeSize(value: unknown): value is PracticeSize {
  return value === 10 || value === 20 || value === "all";
}

/** Remove duplicate ids while preserving first-seen order. */
export function dedupeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function directionFor(mode: PracticeMode, index: number): PracticeDirection {
  if (mode === "recall") return "recall";
  if (mode === "reverse") return "reverse";
  // Mixed: deterministic alternation by position so the plan is reproducible
  // and, once persisted, stable across refresh/resume.
  return index % 2 === 0 ? "recall" : "reverse";
}

/**
 * Build the ordered practice plan. Ids are de-duplicated (an item appears once
 * even if it matches multiple topics), limited to the chosen size (never padded
 * with duplicates to reach it), and given a stable direction per position.
 */
export function buildPracticePlan(
  itemIds: string[],
  mode: PracticeMode,
  size: PracticeSize,
): PracticePlanEntry[] {
  const unique = dedupeIds(itemIds);
  const cap =
    size === "all"
      ? MAX_PRACTICE_SESSION_SIZE
      : Math.min(size, MAX_PRACTICE_SESSION_SIZE);
  return unique
    .slice(0, cap)
    .map((itemId, index) => ({ itemId, direction: directionFor(mode, index) }));
}

/**
 * The still-to-do portion of a plan on resume: entries whose item has no
 * recorded attempt yet in this session. Attempts already made (including
 * "Again") are excluded, so refreshing continues where the learner left off.
 */
export function remainingPlan(
  plan: PracticePlanEntry[],
  attemptedItemIds: Iterable<string>,
): PracticePlanEntry[] {
  const done = new Set(attemptedItemIds);
  return plan.filter((entry) => !done.has(entry.itemId));
}

/**
 * Arguments for the record_review RPC for a PRACTICE attempt. Crucially,
 * `p_affected_schedule` is hard-coded to `false` and no resulting scheduler
 * state is ever sent, so practice can never move a card's FSRS schedule — no
 * matter what a caller passes in.
 */
export function practiceRpcArgs(input: {
  sessionId: string;
  vocabularyItemId: string;
  rating: ReviewRating;
  expectedVersion: number;
  direction: PracticeDirection;
  responseTimeMs: number | null;
  reviewedAt: string;
}): {
  p_session_id: string;
  p_vocabulary_item_id: string;
  p_rating: ReviewRating;
  p_expected_version: number;
  p_resulting_state: SrsCard | null;
  p_response_time_ms: number | null;
  p_exercise_mode: PracticeDirection;
  p_affected_schedule: false;
  p_reviewed_at: string;
} {
  return {
    p_session_id: input.sessionId,
    p_vocabulary_item_id: input.vocabularyItemId,
    p_rating: input.rating,
    p_expected_version: input.expectedVersion,
    p_resulting_state: null,
    p_response_time_ms:
      input.responseTimeMs != null && input.responseTimeMs >= 0
        ? Math.round(input.responseTimeMs)
        : null,
    p_exercise_mode: input.direction,
    p_affected_schedule: false,
    p_reviewed_at: input.reviewedAt,
  };
}
