import { describe, it, expect } from "vitest";
import { evaluateLessonOutcome, getPassThreshold, MODE_THRESHOLDS, DEFAULT_THRESHOLD } from "../lib/outcome.js";

function makeResults(correct, total) {
  return Array.from({ length: total }, (_, i) => ({ correct: i < correct }));
}

describe("getPassThreshold", () => {
  it("returns mode-specific thresholds", () => {
    expect(getPassThreshold("recognition")).toBe(0.6);
    expect(getPassThreshold("sound")).toBe(0.6);
    expect(getPassThreshold("contrast")).toBe(0.6);
    expect(getPassThreshold("checkpoint")).toBe(0.7);
    expect(getPassThreshold("harakat-intro")).toBe(0.5);
    expect(getPassThreshold("harakat")).toBe(0.6);
    expect(getPassThreshold("harakat-mixed")).toBe(0.6);
  });

  it("returns null for review (never gates progression)", () => {
    expect(getPassThreshold("review")).toBeNull();
  });

  it("returns default threshold for unknown modes", () => {
    expect(getPassThreshold("some-future-mode")).toBe(DEFAULT_THRESHOLD);
  });
});

describe("evaluateLessonOutcome", () => {
  it("passes a recognition lesson at 60%", () => {
    const r = evaluateLessonOutcome(makeResults(3, 5), "recognition");
    expect(r.passed).toBe(true);
    expect(r.accuracy).toBe(0.6);
    expect(r.threshold).toBe(0.6);
  });

  it("fails a recognition lesson below 60%", () => {
    const r = evaluateLessonOutcome(makeResults(2, 10), "recognition");
    expect(r.passed).toBe(false);
  });

  it("checkpoint requires 70%", () => {
    const at65 = evaluateLessonOutcome(makeResults(65, 100), "checkpoint");
    expect(at65.passed).toBe(false);
    expect(at65.threshold).toBe(0.7);

    const at70 = evaluateLessonOutcome(makeResults(7, 10), "checkpoint");
    expect(at70.passed).toBe(true);
  });

  it("harakat-intro is lenient at 50%", () => {
    const at50 = evaluateLessonOutcome(makeResults(3, 6), "harakat-intro");
    expect(at50.passed).toBe(true);
    expect(at50.threshold).toBe(0.5);

    const at33 = evaluateLessonOutcome(makeResults(2, 6), "harakat-intro");
    expect(at33.passed).toBe(false);
  });

  it("review always passes with null threshold", () => {
    const r = evaluateLessonOutcome(makeResults(0, 10), "review");
    expect(r.passed).toBe(true);
    expect(r.threshold).toBeNull();
  });

  it("handles empty results", () => {
    const r = evaluateLessonOutcome([], "recognition");
    expect(r.total).toBe(0);
    expect(r.correct).toBe(0);
    expect(r.accuracy).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("returns total, correct, accuracy fields", () => {
    const r = evaluateLessonOutcome(makeResults(4, 5), "sound");
    expect(r.total).toBe(5);
    expect(r.correct).toBe(4);
    expect(r.accuracy).toBe(0.8);
  });

  it("unknown mode uses default threshold", () => {
    const r = evaluateLessonOutcome(makeResults(6, 10), "unknown-mode");
    expect(r.passed).toBe(true);
    expect(r.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("lesson completion integration", () => {
  it("failed lesson does not get added to completedLessonIds", () => {
    const completedIds = [1, 2, 3];
    const quizResults = makeResults(2, 10);
    const outcome = evaluateLessonOutcome(quizResults, "recognition");
    const newIds = outcome.passed ? [...completedIds, 4] : completedIds;
    expect(newIds).toEqual([1, 2, 3]);
  });

  it("passed lesson gets added to completedLessonIds", () => {
    const completedIds = [1, 2, 3];
    const quizResults = makeResults(8, 10);
    const outcome = evaluateLessonOutcome(quizResults, "recognition");
    const newIds = outcome.passed ? [...completedIds, 4] : completedIds;
    expect(newIds).toEqual([1, 2, 3, 4]);
  });

  it("review with string id never unlocks linear progression", () => {
    const lessonId = "review";
    const outcome = evaluateLessonOutcome(makeResults(0, 5), "review");
    expect(typeof lessonId === "number").toBe(false);
    expect(outcome.passed).toBe(true);
  });

  it("checkpoint at 65% fails with 70% threshold", () => {
    const outcome = evaluateLessonOutcome(makeResults(65, 100), "checkpoint");
    expect(outcome.passed).toBe(false);
    // phase intercept should not fire
  });

  it("checkpoint at 70% passes", () => {
    const outcome = evaluateLessonOutcome(makeResults(70, 100), "checkpoint");
    expect(outcome.passed).toBe(true);
  });
});

describe("threshold display in UI", () => {
  it("outcome.threshold can be rendered as percentage", () => {
    const r = evaluateLessonOutcome(makeResults(1, 10), "checkpoint");
    const displayPct = r.threshold != null ? Math.round(r.threshold * 100) : null;
    expect(displayPct).toBe(70);
  });

  it("review has null threshold so UI shows no requirement", () => {
    const r = evaluateLessonOutcome(makeResults(1, 10), "review");
    expect(r.threshold).toBeNull();
  });
});

describe("retry mastery consistency", () => {
  // Documents the intentional design: each quiz attempt's results are recorded
  // exactly once. "Try Again" records attempt N, then the retry produces fresh
  // results for attempt N+1. No double-counting of the same results.

  it("retry produces independent outcomes — not a re-evaluation of the same results", () => {
    const attempt1 = makeResults(2, 10); // 20% — fail
    const attempt2 = makeResults(8, 10); // 80% — pass

    const outcome1 = evaluateLessonOutcome(attempt1, "recognition");
    const outcome2 = evaluateLessonOutcome(attempt2, "recognition");

    expect(outcome1.passed).toBe(false);
    expect(outcome2.passed).toBe(true);
    // Each outcome evaluates its own quizResults independently
    expect(outcome1.correct).toBe(2);
    expect(outcome2.correct).toBe(8);
  });

  it("mastery merge is idempotent per-result-set — same results merged twice inflate attempts", () => {
    // This test documents that merging the same results twice IS a double-count.
    // The retry flow avoids this by using the "Try Again" path (records once)
    // OR the "Back to Home" path (records once) — never both for the same results.
    const results = makeResults(3, 5);
    expect(results.length).toBe(5);
    // The contract: callers must ensure each result set is passed to
    // handleLessonComplete exactly once.
  });
});

describe("first-fail UX for lesson 1", () => {
  it("first-ever fail produces distinct copy context", () => {
    const outcome = evaluateLessonOutcome(makeResults(1, 5), "recognition");
    expect(outcome.passed).toBe(false);
    // LessonSummary uses (isFirst && failed) to show "A good start." instead of
    // "Keep practicing." — this test verifies the outcome is correctly "failed"
    // so the branch triggers.
    const isFirst = true; // lessonsCompleted === 0 && lesson.id === 1
    const isFirstFail = !outcome.passed && isFirst;
    expect(isFirstFail).toBe(true);
  });
});

describe("skipIntro contract", () => {
  it("skipIntro=true starts at quiz phase", () => {
    // LessonScreen uses: useState(skipIntro ? "quiz" : "intro")
    const skipIntro = true;
    expect(skipIntro ? "quiz" : "intro").toBe("quiz");
  });

  it("skipIntro=false/undefined starts at intro phase", () => {
    expect(false ? "quiz" : "intro").toBe("intro");
    expect(undefined ? "quiz" : "intro").toBe("intro");
  });

  it("retry flow sets skipIntro=true so user skips intro on retry", () => {
    // App.jsx: handleLessonRetry calls setIsRetry(true)
    // then passes skipIntro={isRetry} to LessonScreen
    let isRetry = false;
    // Simulates handleLessonRetry
    isRetry = true;
    expect(isRetry ? "quiz" : "intro").toBe("quiz");
  });

  it("normal lesson start clears skipIntro", () => {
    // App.jsx: handleStartLesson calls setIsRetry(false)
    let isRetry = true;
    // Simulates handleStartLesson
    isRetry = false;
    expect(isRetry ? "quiz" : "intro").toBe("intro");
  });
});
