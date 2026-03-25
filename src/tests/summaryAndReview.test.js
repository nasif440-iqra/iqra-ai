import { describe, it, expect } from "vitest";
import {
  getPerformanceBand,
  getSummaryMessaging,
  getCompletionTier,
} from "../lib/engagement.js";
import {
  getSupportedReviewLetterIds,
  buildReviewLessonPayload,
  planReviewSession,
} from "../lib/selectors.js";

// ── Performance band tests ──

describe("getPerformanceBand", () => {
  it("returns 'strong' for accuracy >= 80", () => {
    expect(getPerformanceBand(80)).toBe("strong");
    expect(getPerformanceBand(100)).toBe("strong");
    expect(getPerformanceBand(95)).toBe("strong");
  });

  it("returns 'partial' for accuracy >= 50 and < 80", () => {
    expect(getPerformanceBand(50)).toBe("partial");
    expect(getPerformanceBand(65)).toBe("partial");
    expect(getPerformanceBand(79)).toBe("partial");
  });

  it("returns 'weak' for accuracy < 50", () => {
    expect(getPerformanceBand(0)).toBe("weak");
    expect(getPerformanceBand(25)).toBe("weak");
    expect(getPerformanceBand(49)).toBe("weak");
  });
});

// ── Summary messaging honesty tests ──

describe("getSummaryMessaging", () => {
  const recognitionLesson = { lessonMode: "recognition" };
  const teachLetters = [{ name: "Ba" }];

  it("does NOT produce 'You learned' copy for weak performance", () => {
    const { recap, sectionHeading } = getSummaryMessaging(recognitionLesson, teachLetters, [], 25);
    expect(recap).not.toMatch(/You learned/i);
    expect(sectionHeading).not.toBe("What you learned");
    expect(sectionHeading).toBe("Keep reviewing");
  });

  it("produces improving/practice copy for medium performance", () => {
    const { recap, sectionHeading } = getSummaryMessaging(recognitionLesson, teachLetters, [], 60);
    expect(recap).toMatch(/improving/i);
    expect(sectionHeading).toBe("What you practiced");
  });

  it("produces mastery copy for strong performance", () => {
    const { recap, sectionHeading } = getSummaryMessaging(recognitionLesson, teachLetters, [], 90);
    expect(recap).toMatch(/You learned to recognize/i);
    expect(sectionHeading).toBe("What you learned");
  });

  it("handles sound lesson mode with weak performance", () => {
    const soundLesson = { lessonMode: "sound" };
    const { recap } = getSummaryMessaging(soundLesson, teachLetters, [], 30);
    expect(recap).not.toMatch(/You connected/);
    expect(recap).toMatch(/started hearing/i);
  });

  it("handles contrast lesson mode with partial performance", () => {
    const contrastLesson = { lessonMode: "contrast" };
    const letters = [{ name: "Ba" }, { name: "Ta" }];
    const { recap } = getSummaryMessaging(contrastLesson, letters, [], 60);
    expect(recap).toMatch(/improving/i);
  });

  it("handles harakat-intro with weak performance", () => {
    const lesson = { lessonMode: "harakat-intro" };
    const { recap } = getSummaryMessaging(lesson, [], [], 20);
    expect(recap).toMatch(/started learning/i);
    expect(recap).not.toMatch(/You learned the three/);
  });
});

// ── Completion tier tests ──

describe("getCompletionTier", () => {
  it("returns 'struggling' for accuracy below 50", () => {
    expect(getCompletionTier(30, false, false)).toBe("struggling");
    expect(getCompletionTier(0, false, false)).toBe("struggling");
  });

  it("returns 'good' for accuracy 50-79", () => {
    expect(getCompletionTier(50, false, false)).toBe("good");
    expect(getCompletionTier(70, false, false)).toBe("good");
  });

  it("returns 'great' for accuracy >= 80", () => {
    expect(getCompletionTier(80, false, false)).toBe("great");
    expect(getCompletionTier(90, false, false)).toBe("great");
  });

  it("returns harakat struggling tier for weak harakat performance", () => {
    expect(getCompletionTier(30, false, true)).toBe("harakatStruggling");
  });
});

// ── Review launch safety tests ──

describe("getSupportedReviewLetterIds", () => {
  it("extracts numeric letter IDs from entity keys", () => {
    const keys = ["letter:2", "letter:5", "letter:8"];
    expect(getSupportedReviewLetterIds(keys)).toEqual([2, 5, 8]);
  });

  it("filters out combo entities", () => {
    const keys = ["letter:2", "combo:ba-fatha", "letter:5", "combo:ta-kasra"];
    const result = getSupportedReviewLetterIds(keys);
    expect(result).toEqual([2, 5]);
    expect(result).not.toContain("combo:ba-fatha");
  });

  it("filters out unknown entities", () => {
    const keys = ["unknown:foo", "letter:3"];
    expect(getSupportedReviewLetterIds(keys)).toEqual([3]);
  });

  it("returns empty array for all unsupported items", () => {
    const keys = ["combo:ba-fatha", "combo:ta-kasra", "unknown:x"];
    expect(getSupportedReviewLetterIds(keys)).toEqual([]);
  });

  it("deduplicates letter IDs", () => {
    const keys = ["letter:2", "letter:2", "letter:5"];
    expect(getSupportedReviewLetterIds(keys)).toEqual([2, 5]);
  });

  it("returns empty array for empty input", () => {
    expect(getSupportedReviewLetterIds([])).toEqual([]);
  });
});

describe("buildReviewLessonPayload", () => {
  const emptyMastery = { entities: {}, skills: {}, confusions: {} };

  it("returns null when no review items exist", () => {
    const result = buildReviewLessonPayload(emptyMastery, [1, 2], "2026-03-25");
    expect(result).toBeNull();
  });

  it("builds valid payload with letter entities", () => {
    const mastery = {
      entities: {
        "letter:2": { correct: 2, attempts: 5, lastSeen: "2026-03-24", nextReview: "2026-03-25", intervalDays: 1, sessionStreak: 0 },
        "letter:5": { correct: 1, attempts: 4, lastSeen: "2026-03-24", nextReview: "2026-03-25", intervalDays: 1, sessionStreak: 0 },
      },
      skills: {},
      confusions: {},
    };
    const result = buildReviewLessonPayload(mastery, [1, 2, 3], "2026-03-25");
    expect(result).not.toBeNull();
    expect(result.lessonMode).toBe("review");
    expect(result.teachIds).toContain(2);
    expect(result.teachIds).toContain(5);
    // All teachIds should be numbers
    result.teachIds.forEach(id => expect(typeof id).toBe("number"));
  });

  it("filters out combo entities and still builds payload from letters", () => {
    const mastery = {
      entities: {
        "letter:3": { correct: 1, attempts: 4, lastSeen: "2026-03-24", nextReview: "2026-03-25", intervalDays: 1, sessionStreak: 0 },
        "combo:ba-fatha": { correct: 0, attempts: 3, lastSeen: "2026-03-24", nextReview: "2026-03-25", intervalDays: 1, sessionStreak: 0 },
      },
      skills: {},
      confusions: {},
    };
    const result = buildReviewLessonPayload(mastery, [1, 2], "2026-03-25");
    expect(result).not.toBeNull();
    expect(result.teachIds).toContain(3);
    expect(result.teachIds.every(id => typeof id === "number")).toBe(true);
  });

  it("returns null when only combo entities are due", () => {
    const mastery = {
      entities: {
        "combo:ba-fatha": { correct: 0, attempts: 3, lastSeen: "2026-03-24", nextReview: "2026-03-25", intervalDays: 1, sessionStreak: 0 },
      },
      skills: {},
      confusions: {},
    };
    const result = buildReviewLessonPayload(mastery, [1, 2], "2026-03-25");
    expect(result).toBeNull();
  });
});

describe("planReviewSession safety", () => {
  it("does not crash with empty mastery", () => {
    const result = planReviewSession({ entities: {}, skills: {}, confusions: {} }, "2026-03-25");
    expect(result.hasReviewWork).toBe(false);
    expect(result.items).toEqual([]);
  });

  it("handles mastery with only unsupported confusion keys", () => {
    const mastery = {
      entities: {},
      skills: {},
      confusions: {
        "harakat:ba-fatha->ba-kasra": { count: 3, lastSeen: "2026-03-24" },
      },
    };
    const result = planReviewSession(mastery, "2026-03-25");
    // Should not crash — confused items become combo entity keys which are filtered downstream
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });
});
