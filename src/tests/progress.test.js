// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTodayDateString, getDayDifference, recalculateWirdOnAppOpen, recordPractice, loadProgress, saveProgress, resetProgress, sanitizeCompletedIds, PROGRESS_SCHEMA_VERSION } from "../lib/progress.js";
import { getLessonsCompletedCount, getLastCompletedLesson } from "../lib/selectors.js";

describe("getTodayDateString", () => {
  it("returns a valid YYYY-MM-DD string", () => {
    const result = getTodayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getDayDifference", () => {
  it("returns 0 for same day", () => {
    expect(getDayDifference("2024-03-15", "2024-03-15")).toBe(0);
  });

  it("returns 1 for one day apart", () => {
    expect(getDayDifference("2024-03-16", "2024-03-15")).toBe(1);
  });

  it("returns 2 for two days apart", () => {
    expect(getDayDifference("2024-03-17", "2024-03-15")).toBe(2);
  });

  it("returns negative for reversed dates", () => {
    expect(getDayDifference("2024-03-15", "2024-03-17")).toBe(-2);
  });
});

describe("recalculateWirdOnAppOpen", () => {
  const today = getTodayDateString();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const twoDaysAgo = (() => {
    const d = new Date(); d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  it("does NOT increment wird on app open", () => {
    const prog = { lastPracticeDate: today, currentWird: 3, longestWird: 5, todayLessonCountDate: today, todayLessonCount: 1 };
    const { result } = recalculateWirdOnAppOpen(prog);
    expect(result.currentWird).toBe(3);
  });

  it("preserves wird when practiced yesterday", () => {
    const prog = { lastPracticeDate: yesterday, currentWird: 3, longestWird: 5, todayLessonCountDate: yesterday, todayLessonCount: 2 };
    const { result } = recalculateWirdOnAppOpen(prog);
    expect(result.currentWird).toBe(3);
  });

  it("resets wird when gap >= 2 days", () => {
    const prog = { lastPracticeDate: twoDaysAgo, currentWird: 5, longestWird: 10, todayLessonCountDate: twoDaysAgo, todayLessonCount: 2 };
    const { result } = recalculateWirdOnAppOpen(prog);
    expect(result.currentWird).toBe(0);
    expect(result.longestWird).toBe(10); // preserved
  });

  it("resets todayLessonCount on new day", () => {
    const prog = { lastPracticeDate: yesterday, currentWird: 2, longestWird: 5, todayLessonCountDate: yesterday, todayLessonCount: 3 };
    const { result } = recalculateWirdOnAppOpen(prog);
    expect(result.todayLessonCount).toBe(0);
    expect(result.todayLessonCountDate).toBe(today);
  });
});

describe("recordPractice", () => {
  const today = getTodayDateString();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const twoDaysAgo = (() => {
    const d = new Date(); d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  it("increments wird on consecutive day practice", () => {
    const prog = { lastPracticeDate: yesterday, currentWird: 3, longestWird: 5, todayLessonCountDate: today, todayLessonCount: 0 };
    const result = recordPractice(prog);
    expect(result.currentWird).toBe(4);
    expect(result.longestWird).toBe(5);
  });

  it("resets wird after gap of 2+ days", () => {
    const prog = { lastPracticeDate: twoDaysAgo, currentWird: 5, longestWird: 10, todayLessonCountDate: today, todayLessonCount: 0 };
    const result = recordPractice(prog);
    expect(result.currentWird).toBe(1);
    expect(result.longestWird).toBe(10);
  });

  it("does NOT double-increment wird on same day", () => {
    const prog = { lastPracticeDate: today, currentWird: 3, longestWird: 5, todayLessonCountDate: today, todayLessonCount: 1 };
    const result = recordPractice(prog);
    expect(result.currentWird).toBe(3); // unchanged
    expect(result.todayLessonCount).toBe(2); // but lesson count increments
  });

  it("sets wird to 1 on first-ever practice", () => {
    const prog = { lastPracticeDate: null, currentWird: 0, longestWird: 0, todayLessonCountDate: today, todayLessonCount: 0 };
    const result = recordPractice(prog);
    expect(result.currentWird).toBe(1);
    expect(result.longestWird).toBe(1);
  });

  it("updates longestWird when current exceeds it", () => {
    const prog = { lastPracticeDate: yesterday, currentWird: 5, longestWird: 5, todayLessonCountDate: today, todayLessonCount: 0 };
    const result = recordPractice(prog);
    expect(result.currentWird).toBe(6);
    expect(result.longestWird).toBe(6);
  });
});

describe("sanitizeCompletedIds", () => {
  it("keeps only numeric IDs", () => {
    expect(sanitizeCompletedIds([1, "2", null, 3])).toEqual([1, 3]);
  });

  it("deduplicates IDs", () => {
    expect(sanitizeCompletedIds([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });

  it("keeps only IDs that exist in LESSONS", () => {
    // 999 doesn't exist
    expect(sanitizeCompletedIds([1, 2, 999])).toEqual([1, 2]);
  });

  it("sorts ascending", () => {
    expect(sanitizeCompletedIds([5, 2, 8, 1])).toEqual([1, 2, 5, 8]);
  });

  it("preserves valid Phase 2/3 lesson IDs (44-83)", () => {
    const ids = [1, 2, 44, 50, 66, 83];
    const result = sanitizeCompletedIds(ids);
    expect(result).toContain(44);
    expect(result).toContain(50);
    expect(result).toContain(66);
    expect(result).toContain(83);
  });

  it("returns empty array for non-array input", () => {
    expect(sanitizeCompletedIds(null)).toEqual([]);
    expect(sanitizeCompletedIds(undefined)).toEqual([]);
  });
});

describe("loadProgress migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("preserves valid Phase 2/3 lesson IDs on load", () => {
    localStorage.setItem("iqra_progress", JSON.stringify({
      completedLessonIds: [1, 2, 3, 44, 50, 66, 83],
    }));
    const result = loadProgress();
    expect(result.completedLessonIds).toContain(44);
    expect(result.completedLessonIds).toContain(50);
    expect(result.completedLessonIds).toContain(66);
    expect(result.completedLessonIds).toContain(83);
  });

  it("removes invalid IDs on load", () => {
    localStorage.setItem("iqra_progress", JSON.stringify({
      completedLessonIds: [1, 999, -1, 2],
    }));
    const result = loadProgress();
    expect(result.completedLessonIds).toEqual([1, 2]);
  });

  it("sets schemaVersion on load", () => {
    const result = loadProgress();
    expect(result.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
  });

  it("migrates onboarding from legacy localStorage keys", () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.setItem("onboardingIntention", "I want to read the Quran confidently");
    localStorage.setItem("onboardingDailyGoal", "5");
    const result = loadProgress();
    expect(result.onboarded).toBe(true);
    expect(result.onboardingIntention).toBe("I want to read the Quran confidently");
    expect(result.onboardingDailyGoal).toBe("5");
  });

  it("canonical iqra_progress onboarding takes precedence over legacy keys", () => {
    localStorage.setItem("iqra_progress", JSON.stringify({
      onboarded: true,
      onboardingIntention: "canonical intention",
      onboardingDailyGoal: "10",
    }));
    localStorage.setItem("onboardingIntention", "legacy intention");
    localStorage.setItem("onboardingDailyGoal", "3");
    const result = loadProgress();
    expect(result.onboardingIntention).toBe("canonical intention");
    expect(result.onboardingDailyGoal).toBe("10");
  });
});

// Helper to build a full save payload with defaults
function makeSavePayload(overrides = {}) {
  return {
    onboarded: true,
    onboardingIntention: null,
    onboardingDailyGoal: null,
    onboardingStartingPoint: null,
    onboardingMotivation: null,
    onboardingCommitmentComplete: false,
    onboardingVersion: 2,
    completedLessonIds: [],
    mastery: { entities: {}, skills: {}, confusions: {} },
    habit: { lastPracticeDate: null, currentWird: 0, longestWird: 0, todayLessonCountDate: null, todayLessonCount: 0 },
    ...overrides,
  };
}

describe("saveProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists schemaVersion and onboarding data", () => {
    saveProgress(makeSavePayload({
      onboardingIntention: "test",
      onboardingDailyGoal: "5",
      completedLessonIds: [1, 2],
    }));
    const stored = JSON.parse(localStorage.getItem("iqra_progress"));
    expect(stored.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
    expect(stored.onboardingIntention).toBe("test");
    expect(stored.onboardingDailyGoal).toBe("5");
  });

  it("persists new v2 onboarding fields", () => {
    saveProgress(makeSavePayload({
      onboardingStartingPoint: "I'm completely new",
      onboardingMotivation: "I want to read the Quran confidently",
      onboardingCommitmentComplete: true,
      onboardingVersion: 2,
    }));
    const stored = JSON.parse(localStorage.getItem("iqra_progress"));
    expect(stored.onboardingStartingPoint).toBe("I'm completely new");
    expect(stored.onboardingMotivation).toBe("I want to read the Quran confidently");
    expect(stored.onboardingCommitmentComplete).toBe(true);
    expect(stored.onboardingVersion).toBe(2);
  });

  it("does not persist redundant lessonsCompleted or lastCompletedLessonId", () => {
    saveProgress(makeSavePayload({ completedLessonIds: [1, 2, 3] }));
    const stored = JSON.parse(localStorage.getItem("iqra_progress"));
    expect(stored.lessonsCompleted).toBeUndefined();
    expect(stored.lastCompletedLessonId).toBeUndefined();
  });
});

describe("resetProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears all onboarding and progress keys", () => {
    localStorage.setItem("iqra_progress", JSON.stringify({ onboarded: true }));
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.setItem("onboardingIntention", "test");
    localStorage.setItem("onboardingDailyGoal", "5");
    localStorage.setItem("lastHadithInterstitialDate", "2026-01-01");

    // Mock location.reload to prevent actual reload in tests
    delete window.location;
    window.location = { reload: vi.fn() };
    resetProgress();

    expect(localStorage.getItem("iqra_progress")).toBeNull();
    expect(localStorage.getItem("hasCompletedOnboarding")).toBeNull();
    expect(localStorage.getItem("onboardingIntention")).toBeNull();
    expect(localStorage.getItem("onboardingDailyGoal")).toBeNull();
    expect(localStorage.getItem("lastHadithInterstitialDate")).toBeNull();
  });
});

describe("canonical onboarding persistence", () => {
  beforeEach(() => { localStorage.clear(); });

  it("onboarding completion persists onboarded:true via save → load round-trip", () => {
    saveProgress(makeSavePayload({
      onboardingIntention: "I want to read the Quran confidently",
      onboardingDailyGoal: "5",
    }));
    const reloaded = loadProgress();
    expect(reloaded.onboarded).toBe(true);
    expect(reloaded.onboardingIntention).toBe("I want to read the Quran confidently");
    expect(reloaded.onboardingDailyGoal).toBe("5");
  });

  it("reload after onboarding does not show onboarding again", () => {
    saveProgress(makeSavePayload({ onboardingDailyGoal: "3" }));
    const afterReload = loadProgress();
    expect(afterReload.onboarded).toBe(true);
  });

  it("reset clears canonical + legacy onboarding state", () => {
    saveProgress(makeSavePayload({
      onboardingIntention: "test",
      onboardingDailyGoal: "5",
      completedLessonIds: [1, 2],
    }));
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.setItem("onboardingIntention", "legacy");

    delete window.location;
    window.location = { reload: vi.fn() };
    resetProgress();

    expect(localStorage.getItem("iqra_progress")).toBeNull();
    expect(localStorage.getItem("hasCompletedOnboarding")).toBeNull();
    expect(localStorage.getItem("onboardingIntention")).toBeNull();

    const fresh = loadProgress();
    expect(fresh.onboarded).toBe(false);
    expect(fresh.completedLessonIds).toEqual([]);
  });
});

describe("v2 onboarding fields persistence", () => {
  beforeEach(() => { localStorage.clear(); });

  it("persists and loads startingPoint, motivation, commitmentComplete via round-trip", () => {
    saveProgress(makeSavePayload({
      onboardingStartingPoint: "I used to learn, but forgot a lot",
      onboardingMotivation: "I want to reconnect properly",
      onboardingCommitmentComplete: true,
      onboardingVersion: 2,
    }));
    const reloaded = loadProgress();
    expect(reloaded.onboardingStartingPoint).toBe("I used to learn, but forgot a lot");
    expect(reloaded.onboardingMotivation).toBe("I want to reconnect properly");
    expect(reloaded.onboardingCommitmentComplete).toBe(true);
    expect(reloaded.onboardingVersion).toBe(2);
  });

  it("legacy v1 users get commitmentComplete=true so they skip post-lesson flow", () => {
    // Simulate a v1 user: onboarded=true but no v2 fields saved
    localStorage.setItem("iqra_progress", JSON.stringify({
      schemaVersion: 3,
      onboarded: true,
      onboardingIntention: "legacy intention",
      onboardingDailyGoal: "5",
      lessonCompletion: { completedLessonIds: [1, 2] },
      mastery: { entities: {}, skills: {}, confusions: {} },
      habit: { lastPracticeDate: null, currentWird: 0, longestWird: 0, todayLessonCountDate: null, todayLessonCount: 0 },
    }));
    const loaded = loadProgress();
    expect(loaded.onboarded).toBe(true);
    expect(loaded.onboardingStartingPoint).toBeNull();
    expect(loaded.onboardingMotivation).toBeNull();
    expect(loaded.onboardingCommitmentComplete).toBe(true); // auto-granted for legacy
    expect(loaded.onboardingVersion).toBe(1);
  });

  it("fresh user gets onboardingVersion 2 by default", () => {
    const loaded = loadProgress();
    expect(loaded.onboardingVersion).toBe(2);
  });

  it("pre-lesson onboarding sets onboarded without commitment fields", () => {
    saveProgress(makeSavePayload({
      onboardingStartingPoint: "I'm completely new",
      onboardingCommitmentComplete: false,
      onboardingMotivation: null,
      onboardingDailyGoal: null,
    }));
    const loaded = loadProgress();
    expect(loaded.onboarded).toBe(true);
    expect(loaded.onboardingCommitmentComplete).toBe(false);
    expect(loaded.onboardingMotivation).toBeNull();
    expect(loaded.onboardingDailyGoal).toBeNull();
  });

  it("legacy user migrated via hasCompletedOnboarding key also gets commitmentComplete=true", () => {
    // User who onboarded via the old loose localStorage key, no iqra_progress onboarding fields
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.setItem("onboardingIntention", "I want to read the Quran confidently");
    localStorage.setItem("onboardingDailyGoal", "5");
    const loaded = loadProgress();
    expect(loaded.onboarded).toBe(true);
    expect(loaded.onboardingVersion).toBe(1);
    expect(loaded.onboardingCommitmentComplete).toBe(true); // must not intercept
  });

  it("v2 user who completed pre-lesson but not post-lesson keeps commitmentComplete=false", () => {
    saveProgress(makeSavePayload({
      onboardingStartingPoint: "I'm completely new",
      onboardingCommitmentComplete: false,
      onboardingVersion: 2,
    }));
    const loaded = loadProgress();
    expect(loaded.onboarded).toBe(true);
    expect(loaded.onboardingVersion).toBe(2);
    expect(loaded.onboardingCommitmentComplete).toBe(false); // should still see post-lesson flow
  });

  it("v2 user who completed both flows keeps commitmentComplete=true", () => {
    saveProgress(makeSavePayload({
      onboardingStartingPoint: "I know a few letters",
      onboardingMotivation: "I want to build a daily Quran habit",
      onboardingDailyGoal: "5",
      onboardingCommitmentComplete: true,
      onboardingVersion: 2,
    }));
    const loaded = loadProgress();
    expect(loaded.onboardingCommitmentComplete).toBe(true);
    expect(loaded.onboardingVersion).toBe(2);
  });

  it("post-lesson onboarding completes commitment with motivation and goal", () => {
    // Step 1: pre-lesson save
    saveProgress(makeSavePayload({
      onboardingStartingPoint: "I'm completely new",
      onboardingCommitmentComplete: false,
    }));
    // Step 2: post-lesson save
    saveProgress(makeSavePayload({
      onboardingStartingPoint: "I'm completely new",
      onboardingMotivation: "I want to build a daily Quran habit",
      onboardingDailyGoal: "5",
      onboardingCommitmentComplete: true,
      completedLessonIds: [1],
    }));
    const loaded = loadProgress();
    expect(loaded.onboardingCommitmentComplete).toBe(true);
    expect(loaded.onboardingMotivation).toBe("I want to build a daily Quran habit");
    expect(loaded.onboardingDailyGoal).toBe("5");
    expect(loaded.completedLessonIds).toEqual([1]);
  });
});

describe("derived progress values", () => {
  it("getLessonsCompletedCount derives count from completedLessonIds", () => {
    expect(getLessonsCompletedCount([])).toBe(0);
    expect(getLessonsCompletedCount([1, 2, 3])).toBe(3);
    expect(getLessonsCompletedCount([1, 5, 44])).toBe(3);
  });

  it("getLastCompletedLesson derives last lesson from completedLessonIds", () => {
    expect(getLastCompletedLesson([])).toBeNull();
    const last = getLastCompletedLesson([1, 3, 2]);
    expect(last).not.toBeNull();
    expect(last.id).toBe(3);
  });

  it("getLastCompletedLesson returns highest ID lesson regardless of order", () => {
    const last = getLastCompletedLesson([44, 2, 10]);
    expect(last.id).toBe(44);
  });
});
