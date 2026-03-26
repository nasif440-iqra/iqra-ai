import { describe, it, expect } from "vitest";
import { LESSONS } from "../data/lessons.js";
import { getCurrentLesson, getCurrentUnlockedLesson, getLearnedLetterIds, getPhaseCounts, getDailyGoal, getDueLetters, getLessonsCompletedCount, getLastCompletedLesson } from "../lib/selectors.js";

const ALL_IDS = LESSONS.map(l => l.id);
const LAST_LESSON_ID = LESSONS[LESSONS.length - 1].id;
const TOTAL_LESSONS = LESSONS.length;

describe("getCurrentLesson", () => {
  it("returns lesson 1 when nothing is completed", () => {
    const result = getCurrentLesson([]);
    expect(result.id).toBe(1);
  });

  it("returns lesson 2 when lesson 1 is completed", () => {
    const result = getCurrentLesson([1]);
    expect(result.id).toBe(2);
  });

  it("skips to the first uncompleted lesson", () => {
    const result = getCurrentLesson([1, 2, 3]);
    expect(result.id).toBe(4);
  });

  it("returns last lesson when all are completed", () => {
    const result = getCurrentLesson(ALL_IDS);
    expect(result.id).toBe(LAST_LESSON_ID);
  });
});

describe("getLearnedLetterIds", () => {
  it("returns empty array when nothing completed", () => {
    expect(getLearnedLetterIds([])).toEqual([]);
  });

  it("returns teachIds from completed lessons", () => {
    // Lesson 1 teaches [1] (Alif)
    const result = getLearnedLetterIds([1]);
    expect(result).toContain(1);
  });

  it("deduplicates letter IDs across lessons", () => {
    // Lesson 1 teaches [1], lesson 2 teaches [2], lesson 3 teaches [1,2]
    const result = getLearnedLetterIds([1, 2, 3]);
    expect(result.length).toBe(2); // 1, 2
    expect(new Set(result).size).toBe(result.length); // no dupes
  });
});

describe("getPhaseCounts", () => {
  it("returns all zeros when nothing completed", () => {
    const counts = getPhaseCounts([]);
    expect(counts.p1Done).toBe(0);
    expect(counts.p2Done).toBe(0);
    expect(counts.p3Done).toBe(0);
    expect(counts.p1Total).toBeGreaterThan(0);
  });

  it("counts phase 1 completions correctly", () => {
    const counts = getPhaseCounts([1, 2, 3]);
    expect(counts.p1Done).toBe(3);
    expect(counts.p2Done).toBe(0);
  });

  it("returns correct totals", () => {
    const counts = getPhaseCounts([]);
    expect(counts.p1Total).toBe(LESSONS.filter(l => l.phase === 1).length);
    expect(counts.p2Total).toBe(LESSONS.filter(l => l.phase === 2).length);
    expect(counts.p3Total).toBe(LESSONS.filter(l => l.phase === 3).length);
    expect(counts.p1Total + counts.p2Total + counts.p3Total).toBe(TOTAL_LESSONS);
  });
});

describe("getDueLetters", () => {
  it("returns empty array when no progress", () => {
    expect(getDueLetters({}, "2026-03-24")).toEqual([]);
  });

  it("returns empty for letters never seen", () => {
    const progress = {
      1: { correct: 3, attempts: 4, lastSeen: null, nextReview: null, intervalDays: 1, sessionStreak: 0 },
    };
    expect(getDueLetters(progress, "2026-03-24")).toEqual([]);
  });

  it("returns letters whose nextReview is today or earlier", () => {
    const progress = {
      1: { correct: 3, attempts: 4, lastSeen: "2026-03-23", nextReview: "2026-03-24", intervalDays: 1, sessionStreak: 1 },
      2: { correct: 5, attempts: 5, lastSeen: "2026-03-20", nextReview: "2026-03-22", intervalDays: 3, sessionStreak: 2 },
      3: { correct: 2, attempts: 3, lastSeen: "2026-03-24", nextReview: "2026-03-31", intervalDays: 7, sessionStreak: 3 },
    };
    const due = getDueLetters(progress, "2026-03-24");
    expect(due).toContain(1);
    expect(due).toContain(2);
    expect(due).not.toContain(3);
  });

  it("excludes old-format entries without SRS fields", () => {
    const progress = {
      1: { correct: 3, attempts: 4 },
    };
    expect(getDueLetters(progress, "2026-03-24")).toEqual([]);
  });
});

describe("getCurrentUnlockedLesson", () => {
  it("returns lesson 1 when nothing is completed", () => {
    const result = getCurrentUnlockedLesson([]);
    expect(result.id).toBe(1);
  });

  it("returns lesson 2 when lesson 1 is completed", () => {
    const result = getCurrentUnlockedLesson([1]);
    expect(result.id).toBe(2);
  });

  it("skips to the first uncompleted unlocked lesson", () => {
    const result = getCurrentUnlockedLesson([1, 2, 3]);
    expect(result.id).toBe(4);
  });

  it("does not return a locked Phase 2 lesson when Phase 1 threshold is not met", () => {
    // Complete only a few Phase 1 lessons — not enough to unlock Phase 2
    const completed = [1, 2, 3, 4, 5];
    const result = getCurrentUnlockedLesson(completed);
    // Should return the next Phase 1 lesson, not Phase 2
    expect(result.phase).toBe(1);
  });

  it("returns last lesson when all are completed", () => {
    const result = getCurrentUnlockedLesson(ALL_IDS);
    expect(result.id).toBe(LAST_LESSON_ID);
  });
});

describe("getDailyGoal", () => {
  it("returns 1 when no goal set", () => {
    expect(getDailyGoal(null)).toBe(1);
    expect(getDailyGoal(undefined)).toBe(1);
  });

  it("computes goal from minutes string", () => {
    expect(getDailyGoal("3")).toBe(1);
    expect(getDailyGoal("5")).toBe(1);
    expect(getDailyGoal("10")).toBe(2);
  });
});

describe("getLessonsCompletedCount", () => {
  it("returns 0 for empty array", () => {
    expect(getLessonsCompletedCount([])).toBe(0);
  });

  it("returns count of completed lessons", () => {
    expect(getLessonsCompletedCount([1, 2, 3])).toBe(3);
  });
});

describe("getLastCompletedLesson", () => {
  it("returns null for empty array", () => {
    expect(getLastCompletedLesson([])).toBeNull();
  });

  it("returns the lesson with the highest completed ID", () => {
    const result = getLastCompletedLesson([1, 5, 3]);
    expect(result.id).toBe(5);
  });

  it("works with phase 2/3 lesson IDs", () => {
    const result = getLastCompletedLesson([1, 2, 44]);
    expect(result.id).toBe(44);
  });
});

// ── Fix 4: Combo review support ──

import { extractReviewItems, buildReviewLessonPayload } from "../lib/selectors.js";

describe("extractReviewItems", () => {
  it("separates letter and combo entity keys", () => {
    const items = ["letter:2", "combo:ba-fatha", "letter:5", "combo:ta-kasra"];
    const { letterIds, comboIds } = extractReviewItems(items);
    expect(letterIds).toEqual([2, 5]);
    expect(comboIds).toEqual(["ba-fatha", "ta-kasra"]);
  });

  it("handles empty input", () => {
    const { letterIds, comboIds } = extractReviewItems([]);
    expect(letterIds).toEqual([]);
    expect(comboIds).toEqual([]);
  });

  it("handles only letters", () => {
    const { letterIds, comboIds } = extractReviewItems(["letter:1", "letter:3"]);
    expect(letterIds).toEqual([1, 3]);
    expect(comboIds).toEqual([]);
  });

  it("handles only combos", () => {
    const { letterIds, comboIds } = extractReviewItems(["combo:ba-fatha"]);
    expect(letterIds).toEqual([]);
    expect(comboIds).toEqual(["ba-fatha"]);
  });
});

describe("buildReviewLessonPayload — combo support", () => {

  it("includes teachCombos when combo entities are due", () => {
    const mastery = {
      entities: {
        "combo:ba-fatha": { correct: 1, attempts: 3, lastSeen: "2026-03-20", nextReview: "2026-03-20", intervalDays: 1, sessionStreak: 0 },
        "letter:2": { correct: 2, attempts: 3, lastSeen: "2026-03-20", nextReview: "2026-03-20", intervalDays: 1, sessionStreak: 0 },
      },
      skills: {},
      confusions: {},
    };
    const result = buildReviewLessonPayload(mastery, [1, 2, 3], "2026-03-25");
    expect(result).not.toBeNull();
    expect(result.teachIds).toContain(2);
    expect(result.teachCombos).toBeDefined();
    expect(result.teachCombos).toContain("ba-fatha");
  });

  it("returns non-null when only combo entities are due", () => {
    const mastery = {
      entities: {
        "combo:ba-fatha": { correct: 0, attempts: 3, lastSeen: "2026-03-20", nextReview: "2026-03-20", intervalDays: 1, sessionStreak: 0 },
      },
      skills: {},
      confusions: {},
    };
    const result = buildReviewLessonPayload(mastery, [1, 2, 3], "2026-03-25");
    expect(result).not.toBeNull();
    expect(result.teachCombos).toContain("ba-fatha");
  });

  it("returns null when nothing is reviewable", () => {
    const mastery = { entities: {}, skills: {}, confusions: {} };
    const result = buildReviewLessonPayload(mastery, [], "2026-03-25");
    expect(result).toBeNull();
  });
});
