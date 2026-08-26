import { describe, expect, it } from "vitest";
import {
  buildPracticePlan,
  dedupeIds,
  MAX_PRACTICE_SESSION_SIZE,
  practiceRpcArgs,
  remainingPlan,
  type PracticePlanEntry,
} from "./practice";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`);

describe("dedupeIds", () => {
  it("keeps first-seen order and removes duplicates", () => {
    expect(dedupeIds(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});

describe("buildPracticePlan — modes", () => {
  it("Recall makes every entry recall", () => {
    const plan = buildPracticePlan(ids(4), "recall", "all");
    expect(plan.every((e) => e.direction === "recall")).toBe(true);
    expect(plan.map((e) => e.itemId)).toEqual(["w0", "w1", "w2", "w3"]);
  });

  it("Reverse makes every entry reverse", () => {
    const plan = buildPracticePlan(ids(4), "reverse", "all");
    expect(plan.every((e) => e.direction === "reverse")).toBe(true);
  });

  it("Mixed alternates directions deterministically", () => {
    const a = buildPracticePlan(ids(5), "mixed", "all");
    const b = buildPracticePlan(ids(5), "mixed", "all");
    expect(a).toEqual(b); // deterministic / stable
    expect(a.map((e) => e.direction)).toEqual([
      "recall",
      "reverse",
      "recall",
      "reverse",
      "recall",
    ]);
    // Both directions are represented in a mixed session.
    expect(a.some((e) => e.direction === "recall")).toBe(true);
    expect(a.some((e) => e.direction === "reverse")).toBe(true);
  });
});

describe("buildPracticePlan — size & dedupe", () => {
  it("limits to the chosen size", () => {
    expect(buildPracticePlan(ids(50), "recall", 10)).toHaveLength(10);
    expect(buildPracticePlan(ids(50), "recall", 20)).toHaveLength(20);
  });

  it("uses only available items when fewer exist (no padding)", () => {
    const plan = buildPracticePlan(ids(3), "recall", 20);
    expect(plan).toHaveLength(3);
  });

  it("caps 'all' at the safety maximum", () => {
    const plan = buildPracticePlan(ids(500), "mixed", "all");
    expect(plan).toHaveLength(MAX_PRACTICE_SESSION_SIZE);
  });

  it("never repeats a vocabulary id within a session", () => {
    const plan = buildPracticePlan(
      ["a", "a", "b", "b", "b", "c"],
      "mixed",
      "all",
    );
    const seen = new Set(plan.map((e) => e.itemId));
    expect(seen.size).toBe(plan.length);
    expect(plan.map((e) => e.itemId)).toEqual(["a", "b", "c"]);
  });
});

describe("remainingPlan — resume", () => {
  const plan: PracticePlanEntry[] = [
    { itemId: "a", direction: "recall" },
    { itemId: "b", direction: "reverse" },
    { itemId: "c", direction: "recall" },
  ];

  it("returns the full plan when nothing has been attempted", () => {
    expect(remainingPlan(plan, [])).toEqual(plan);
  });

  it("excludes already-attempted items and preserves order/direction", () => {
    const remaining = remainingPlan(plan, ["a"]);
    expect(remaining).toEqual([
      { itemId: "b", direction: "reverse" },
      { itemId: "c", direction: "recall" },
    ]);
  });

  it("is empty once every item has an attempt", () => {
    expect(remainingPlan(plan, ["a", "b", "c"])).toEqual([]);
  });
});

describe("practiceRpcArgs — never affects the schedule", () => {
  const base = {
    sessionId: "s",
    vocabularyItemId: "v",
    rating: 4 as const,
    expectedVersion: 7,
    direction: "recall" as const,
    responseTimeMs: 1234,
    reviewedAt: "2026-01-01T00:00:00.000Z",
  };

  it("always sets affected_schedule false and sends no resulting state", () => {
    const args = practiceRpcArgs(base);
    expect(args.p_affected_schedule).toBe(false);
    expect(args.p_resulting_state).toBeNull();
    expect(args.p_exercise_mode).toBe("recall");
    expect(args.p_rating).toBe(4);
    expect(args.p_expected_version).toBe(7);
  });

  it("passes the direction through as the exercise mode", () => {
    expect(practiceRpcArgs({ ...base, direction: "reverse" }).p_exercise_mode).toBe(
      "reverse",
    );
  });

  it("normalises response time and never emits scheduler fields", () => {
    const negative = practiceRpcArgs({ ...base, responseTimeMs: -5 });
    expect(negative.p_response_time_ms).toBeNull();
    const args = practiceRpcArgs({ ...base, responseTimeMs: 10.7 });
    expect(args.p_response_time_ms).toBe(11);
    // The only scheduler-shaped field is resulting_state, and it is null.
    expect(args.p_resulting_state).toBeNull();
  });
});
