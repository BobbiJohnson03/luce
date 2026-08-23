import { describe, expect, it } from "vitest";
import { applyReview, emptyCard } from "./scheduler";
import type { ReviewRating, SrsCard } from "./types";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function due(card: SrsCard): number {
  return new Date(card.due).getTime();
}

describe("emptyCard", () => {
  it("is a brand-new, immediately-due card", () => {
    const card = emptyCard(NOW);
    expect(card.state).toBe(0); // New
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.last_review).toBeNull();
    expect(card.due).toBe(NOW.toISOString());
  });
});

describe("applyReview on a new card", () => {
  const start = emptyCard(NOW);

  it("Again keeps the card in (re)learning and schedules it very soon", () => {
    const next = applyReview(start, 1, NOW);
    expect(next.state).toBe(1); // Learning
    expect(next.reps).toBe(1);
    expect(due(next)).toBeGreaterThan(NOW.getTime());
  });

  it("Hard advances but stays short-term", () => {
    const next = applyReview(start, 2, NOW);
    expect(next.reps).toBe(1);
    expect(due(next)).toBeGreaterThan(NOW.getTime());
  });

  it("Good advances the card", () => {
    const next = applyReview(start, 3, NOW);
    expect(next.reps).toBe(1);
    expect(due(next)).toBeGreaterThan(NOW.getTime());
  });

  it("Easy graduates the card to Review with a multi-day interval", () => {
    const next = applyReview(start, 4, NOW);
    expect(next.state).toBe(2); // Review
    expect(next.reps).toBe(1);
    expect(next.scheduled_days).toBeGreaterThanOrEqual(1);
    expect(next.stability).toBeGreaterThan(0);
  });

  it("orders intervals Again <= Good < Easy", () => {
    const again = applyReview(start, 1, NOW);
    const good = applyReview(start, 3, NOW);
    const easy = applyReview(start, 4, NOW);
    expect(due(again)).toBeLessThanOrEqual(due(good));
    expect(due(good)).toBeLessThan(due(easy));
  });
});

describe("applyReview on a review card", () => {
  // A mature card last reviewed 10 days ago and due now.
  const reviewCard: SrsCard = {
    due: NOW.toISOString(),
    stability: 10,
    difficulty: 5,
    elapsed_days: 10,
    scheduled_days: 10,
    learning_steps: 0,
    reps: 5,
    lapses: 0,
    state: 2, // Review
    last_review: new Date("2025-12-22T00:00:00.000Z").toISOString(),
  };

  it("Good keeps it in Review and pushes the due date further out", () => {
    const next = applyReview(reviewCard, 3, NOW);
    expect(next.state).toBe(2); // Review
    expect(next.reps).toBe(6);
    expect(next.lapses).toBe(0);
    expect(due(next)).toBeGreaterThan(NOW.getTime());
    expect(next.scheduled_days).toBeGreaterThan(0);
  });

  it("Again lapses the card into Relearning", () => {
    const next = applyReview(reviewCard, 1, NOW);
    expect(next.state).toBe(3); // Relearning
    expect(next.reps).toBe(6);
    expect(next.lapses).toBe(1);
    expect(due(next)).toBeGreaterThan(NOW.getTime());
  });

  it("Easy schedules a longer interval than Good", () => {
    const good = applyReview(reviewCard, 3, NOW);
    const easy = applyReview(reviewCard, 4, NOW);
    expect(due(easy)).toBeGreaterThan(due(good));
  });
});

describe("determinism", () => {
  it("produces identical output for identical inputs (fuzz disabled)", () => {
    const start = emptyCard(NOW);
    for (const rating of [1, 2, 3, 4] as ReviewRating[]) {
      const a = applyReview(start, rating, NOW);
      const b = applyReview(start, rating, NOW);
      expect(a).toEqual(b);
    }
  });

  it("respects the explicit `now` rather than the wall clock", () => {
    const start = emptyCard(NOW);
    const later = new Date("2026-06-01T00:00:00.000Z");
    const fromNow = applyReview(start, 4, NOW);
    const fromLater = applyReview(start, 4, later);
    // Same grade, different reference time => different absolute due dates.
    expect(due(fromLater)).toBeGreaterThan(due(fromNow));
  });
});

describe("invariants", () => {
  it("keeps difficulty within the FSRS 1..10 range", () => {
    let card = emptyCard(NOW);
    let when = NOW;
    const ratings: ReviewRating[] = [1, 3, 3, 2, 4, 1, 3];
    for (const rating of ratings) {
      card = applyReview(card, rating, when);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
      expect(card.difficulty).toBeLessThanOrEqual(10);
      expect(card.stability).toBeGreaterThan(0);
      when = new Date(card.due);
    }
  });
});
