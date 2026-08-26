import { describe, expect, it } from "vitest";
import {
  AGAIN_MAX_REQUEUES,
  AGAIN_REQUEUE_OFFSET,
  answerCurrent,
  createQueue,
  currentItemId,
  isComplete,
  position,
  remainingCount,
} from "./queue";
import { summarizeAttempts, type ReviewAttempt } from "./summary";
import type { ReviewRating } from "./types";

describe("createQueue", () => {
  it("starts at the first item with all counts at zero", () => {
    const q = createQueue(["a", "b", "c"]);
    expect(currentItemId(q)).toBe("a");
    expect(remainingCount(q)).toBe(3);
    expect(position(q)).toBe(1);
    expect(isComplete(q)).toBe(false);
  });

  it("is immediately complete when empty", () => {
    const q = createQueue([]);
    expect(currentItemId(q)).toBeNull();
    expect(isComplete(q)).toBe(true);
  });
});

describe("answerCurrent", () => {
  it("advances to the next card on a non-Again grade without requeueing", () => {
    let q = createQueue(["a", "b"]);
    q = answerCurrent(q, 3);
    expect(currentItemId(q)).toBe("b");
    expect(q.entries).toHaveLength(2);
    q = answerCurrent(q, 4);
    expect(isComplete(q)).toBe(true);
  });

  it("does not mutate the input queue", () => {
    const q = createQueue(["a", "b"]);
    const next = answerCurrent(q, 3);
    expect(q.cursor).toBe(0);
    expect(next.cursor).toBe(1);
    expect(next).not.toBe(q);
  });

  it("requeues an Again card later in the same session", () => {
    let q = createQueue(["a", "b", "c"]);
    q = answerCurrent(q, 1); // 'a' Again
    // 'a' is reinserted AGAIN_REQUEUE_OFFSET positions after the current cursor,
    // clamped to the end of a short queue.
    expect(q.entries.map((e) => e.itemId)).toContain("a");
    expect(q.entries).toHaveLength(4);
    expect(currentItemId(q)).toBe("b");
  });

  it("reinserts at the configured offset in a long queue", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `w${i}`);
    let q = createQueue(ids);
    q = answerCurrent(q, 1); // 'w0' Again at cursor 0
    // Inserted at index cursor + 1 + offset = 0 + 1 + 4 = 5.
    expect(q.entries[AGAIN_REQUEUE_OFFSET + 1].itemId).toBe("w0");
    expect(q.entries[AGAIN_REQUEUE_OFFSET + 1].againCount).toBe(1);
  });

  it("caps requeues so a relentless Again session still terminates", () => {
    let q = createQueue(["a"]);
    let guard = 0;
    let seen = 0;
    while (!isComplete(q) && guard < 1000) {
      seen += 1;
      q = answerCurrent(q, 1); // always Again
      guard += 1;
    }
    expect(isComplete(q)).toBe(true);
    // 'a' is shown once, then requeued at most AGAIN_MAX_REQUEUES times.
    expect(seen).toBe(1 + AGAIN_MAX_REQUEUES);
    expect(q.entries).toHaveLength(1 + AGAIN_MAX_REQUEUES);
  });

  it("never grows without bound for a full queue of Agains", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `w${i}`);
    let q = createQueue(ids);
    let guard = 0;
    while (!isComplete(q) && guard < 100000) {
      q = answerCurrent(q, 1);
      guard += 1;
    }
    expect(isComplete(q)).toBe(true);
    expect(q.entries.length).toBeLessThanOrEqual(
      ids.length * (1 + AGAIN_MAX_REQUEUES),
    );
  });
});

describe("summarizeAttempts", () => {
  it("distinguishes cards from attempts and never exceeds 100%", () => {
    const attempts: ReviewAttempt[] = [
      { itemId: "a", rating: 1 }, // first pass fail
      { itemId: "b", rating: 3 },
      { itemId: "a", rating: 3 }, // requeue pass
      { itemId: "c", rating: 4 },
    ];
    const summary = summarizeAttempts(attempts);
    expect(summary.cards).toBe(3);
    expect(summary.attempts).toBe(4);
    expect(summary.again).toBe(1);
    expect(summary.firstPassRemembered).toBe(2); // b and c
    expect(summary.accuracy).toBe(67);
    expect(summary.accuracy).toBeLessThanOrEqual(100);
  });

  it("is all-zero for an empty session", () => {
    expect(summarizeAttempts([])).toEqual({
      cards: 0,
      attempts: 0,
      firstPassRemembered: 0,
      again: 0,
      accuracy: 0,
    });
  });

  it("reports 100% when every first pass is remembered", () => {
    const attempts: ReviewAttempt[] = [
      { itemId: "a", rating: 3 },
      { itemId: "b", rating: 4 },
    ];
    const summary = summarizeAttempts(attempts);
    expect(summary.accuracy).toBe(100);
  });

  it("counts every Again including repeats", () => {
    const attempts: ReviewAttempt[] = [
      { itemId: "a", rating: 1 },
      { itemId: "a", rating: 1 },
      { itemId: "a", rating: 3 },
    ];
    const summary = summarizeAttempts(attempts);
    expect(summary.cards).toBe(1);
    expect(summary.attempts).toBe(3);
    expect(summary.again).toBe(2);
    expect(summary.firstPassRemembered).toBe(0);
    expect(summary.accuracy).toBe(0);
  });
});

// Type-level guard: ratings stay within the expected union.
const _sample: ReviewRating[] = [1, 2, 3, 4];
void _sample;
