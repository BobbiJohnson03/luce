/**
 * The in-session review queue.
 *
 * This is pure, framework-free logic (no React, no clock, no I/O) so it is easy
 * to reason about and unit test. It fixes the unbounded-requeue bug from the
 * old prototype: an "Again" answer re-inserts the card a few positions later so
 * the learner sees it again in the same session, but each card can only be
 * requeued a bounded number of times, so a session always terminates.
 *
 * Scheduling itself is unaffected by the queue — persistence always records the
 * newest attempt and the FSRS state reflects it. The queue only decides the
 * order in which cards are shown during one sitting.
 */
import type { ReviewRating } from "./types";

/** How many positions after the current card an "Again" card is reinserted. */
export const AGAIN_REQUEUE_OFFSET = 4;

/** Maximum times a single card may be requeued via "Again" in one session. */
export const AGAIN_MAX_REQUEUES = 3;

export interface QueueEntry {
  itemId: string;
  /** How many times this card has already been requeued this session. */
  againCount: number;
}

export interface ReviewQueue {
  entries: QueueEntry[];
  cursor: number;
}

export function createQueue(itemIds: string[]): ReviewQueue {
  return {
    entries: itemIds.map((itemId) => ({ itemId, againCount: 0 })),
    cursor: 0,
  };
}

export function isComplete(queue: ReviewQueue): boolean {
  return queue.cursor >= queue.entries.length;
}

export function currentItemId(queue: ReviewQueue): string | null {
  return queue.entries[queue.cursor]?.itemId ?? null;
}

/** Cards still to be shown, including the current one. */
export function remainingCount(queue: ReviewQueue): number {
  return Math.max(0, queue.entries.length - queue.cursor);
}

/** 1-based index of the current card among all scheduled appearances. */
export function position(queue: ReviewQueue): number {
  return Math.min(queue.cursor + 1, queue.entries.length);
}

/**
 * Advance past the current card after it has been graded. An "Again" (rating 1)
 * requeues the card later in the session, up to `AGAIN_MAX_REQUEUES` times.
 * Returns a new queue; never mutates the input.
 */
export function answerCurrent(
  queue: ReviewQueue,
  rating: ReviewRating,
): ReviewQueue {
  const current = queue.entries[queue.cursor];
  if (!current) return queue;

  const entries = queue.entries.slice();

  if (rating === 1 && current.againCount < AGAIN_MAX_REQUEUES) {
    const insertAt = Math.min(
      entries.length,
      queue.cursor + 1 + AGAIN_REQUEUE_OFFSET,
    );
    entries.splice(insertAt, 0, {
      itemId: current.itemId,
      againCount: current.againCount + 1,
    });
  }

  return { entries, cursor: queue.cursor + 1 };
}
