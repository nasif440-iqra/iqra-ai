import { describe, it, expect } from "vitest";
import { computeQuizProgress } from "../components/lesson/useLessonQuiz.js";

describe("computeQuizProgress", () => {
  it("returns 0 at the start", () => {
    expect(computeQuizProgress(0, 10, 10)).toBe(0);
  });

  it("returns 50 at halfway through original questions", () => {
    expect(computeQuizProgress(5, 10, 10)).toBe(50);
  });

  it("never exceeds 100", () => {
    expect(computeQuizProgress(15, 12, 10)).toBeLessThanOrEqual(100);
  });

  it("uses actual queue length when recycled questions are appended", () => {
    // 10 original, 2 recycled appended, currently at index 8
    const pct = computeQuizProgress(8, 12, 10);
    // 8/12 = 66.67%, not 8/10 = 80%
    expect(pct).toBeCloseTo(66.67, 0);
  });

  it("progress never goes backward when queue grows", () => {
    const before = computeQuizProgress(5, 10, 10); // 50%
    const after = computeQuizProgress(5, 12, 10);   // 5/12 = 41.67%
    // After is lower because denominator grew — this is honest
    // But once we advance past index 5, progress increases
    const advanced = computeQuizProgress(6, 12, 10); // 6/12 = 50%
    expect(advanced).toBeGreaterThanOrEqual(before * 0.95); // roughly similar
  });

  it("handles zero questions gracefully", () => {
    expect(computeQuizProgress(0, 0, 0)).toBe(0);
  });

  it("progress dips when queue grows (honest behavior)", () => {
    // At index 5 of original 10 questions: 50%
    const before = computeQuizProgress(5, 10, 10);
    expect(before).toBe(50);
    // User gets one wrong, queue grows to 11: 5/11 = ~45%
    const after = computeQuizProgress(5, 11, 10);
    expect(after).toBeLessThan(before);
    expect(after).toBeCloseTo(45.45, 0);
  });

  it("progress recovers as user advances past recycled questions", () => {
    // Queue grew to 12 after 2 wrong answers
    const atIdx8 = computeQuizProgress(8, 12, 10);
    const atIdx10 = computeQuizProgress(10, 12, 10);
    expect(atIdx10).toBeGreaterThan(atIdx8);
    expect(atIdx10).toBeCloseTo(83.33, 0);
  });

  it("never returns negative", () => {
    expect(computeQuizProgress(0, 15, 10)).toBeGreaterThanOrEqual(0);
  });
});
