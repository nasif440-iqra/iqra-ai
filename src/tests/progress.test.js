// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTodayDateString, getDayDifference, recalculateWirdOnAppOpen, recordPractice, loadProgress, saveProgress, resetProgress, sanitizeCompletedIds, PROGRESS_SCHEMA_VERSION, isLessonUnlocked, isPhaseCompetent, isPhase2Unlocked, isPhase3Unlocked, PHASE_MASTERY_FRACTION } from "../lib/progress.js";
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
    localStorage.setItem("tila_progress", JSON.stringify({
      completedLessonIds: [1, 2, 3, 44, 50, 66, 83],
    }));
    const result = loadProgress();
    expect(result.completedLessonIds).toContain(44);
    expect(result.completedLessonIds).toContain(50);
    expect(result.completedLessonIds).toContain(66);
    expect(result.completedLessonIds).toContain(83);
  });

  it("removes invalid IDs on load", () => {
    localStorage.setItem("tila_progress", JSON.stringify({
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

  it("canonical tila_progress onboarding takes precedence over legacy keys", () => {
    localStorage.setItem("tila_progress", JSON.stringify({
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
    const stored = JSON.parse(localStorage.getItem("tila_progress"));
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
    const stored = JSON.parse(localStorage.getItem("tila_progress"));
    expect(stored.onboardingStartingPoint).toBe("I'm completely new");
    expect(stored.onboardingMotivation).toBe("I want to read the Quran confidently");
    expect(stored.onboardingCommitmentComplete).toBe(true);
    expect(stored.onboardingVersion).toBe(2);
  });

  it("does not persist redundant lessonsCompleted or lastCompletedLessonId", () => {
    saveProgress(makeSavePayload({ completedLessonIds: [1, 2, 3] }));
    const stored = JSON.parse(localStorage.getItem("tila_progress"));
    expect(stored.lessonsCompleted).toBeUndefined();
    expect(stored.lastCompletedLessonId).toBeUndefined();
  });
});

describe("resetProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears all onboarding and progress keys", () => {
    localStorage.setItem("tila_progress", JSON.stringify({ onboarded: true }));
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.setItem("onboardingIntention", "test");
    localStorage.setItem("onboardingDailyGoal", "5");
    localStorage.setItem("lastHadithInterstitialDate", "2026-01-01");

    // Mock location.reload to prevent actual reload in tests
    delete window.location;
    window.location = { reload: vi.fn() };
    resetProgress();

    expect(localStorage.getItem("tila_progress")).toBeNull();
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

    expect(localStorage.getItem("tila_progress")).toBeNull();
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
    localStorage.setItem("tila_progress", JSON.stringify({
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
    // User who onboarded via the old loose localStorage key, no tila_progress onboarding fields
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

// ── Competence-based phase unlocking ──

import { LESSONS, PHASE_1_COMPLETION_THRESHOLD, PHASE_2_COMPLETION_THRESHOLD } from "../data/lessons.js";

describe("competence-based phase unlocking", () => {
  const today = "2026-03-26";
  const p1Lessons = LESSONS.filter(l => l.phase === 1);
  const p2Lessons = LESSONS.filter(l => l.phase === 2);

  // Helper: build completed IDs for first N lessons of a phase
  function firstNIds(phaseLessons, n) {
    return phaseLessons.slice(0, n).map(l => l.id);
  }

  // Helper: build entities where specified letters are "accurate"
  function makeAccurateEntities(letterIds) {
    const entities = {};
    for (const id of letterIds) {
      entities[`letter:${id}`] = { correct: 8, attempts: 10, sessionStreak: 2, intervalDays: 3, lastSeen: "2026-03-25" };
    }
    return entities;
  }

  // Helper: build entities where specified letters are "unstable"
  function makeUnstableEntities(letterIds) {
    const entities = {};
    for (const id of letterIds) {
      entities[`letter:${id}`] = { correct: 1, attempts: 5, sessionStreak: 0, intervalDays: 1, lastSeen: "2026-03-25" };
    }
    return entities;
  }

  // Get the unique taught letters from first N lessons of a phase
  function getTaughtLetters(phaseLessons, n) {
    const ids = new Set();
    phaseLessons.slice(0, n).forEach(l => (l.teachIds || []).forEach(id => ids.add(id)));
    return [...ids];
  }

  describe("isPhaseCompetent", () => {
    it("returns true when no entities provided (backward compat)", () => {
      const ids = firstNIds(p1Lessons, 15);
      expect(isPhaseCompetent(1, ids, null, today)).toBe(true);
      expect(isPhaseCompetent(1, ids, undefined, today)).toBe(true);
    });

    it("returns true when all phase lessons completed (safety valve)", () => {
      const allP1Ids = p1Lessons.map(l => l.id);
      // Even with terrible mastery, completing everything bypasses the check
      const badEntities = makeUnstableEntities([1, 2, 3]);
      expect(isPhaseCompetent(1, allP1Ids, badEntities, today)).toBe(true);
    });

    it("returns true when enough taught letters are accurate", () => {
      const ids = firstNIds(p1Lessons, 15);
      const taught = getTaughtLetters(p1Lessons, 15);
      // Make all taught letters accurate
      const entities = makeAccurateEntities(taught);
      expect(isPhaseCompetent(1, ids, entities, today)).toBe(true);
    });

    it("returns false when taught letters are mostly unstable", () => {
      const ids = firstNIds(p1Lessons, 15);
      const taught = getTaughtLetters(p1Lessons, 15);
      // Make all taught letters unstable
      const entities = makeUnstableEntities(taught);
      expect(isPhaseCompetent(1, ids, entities, today)).toBe(false);
    });

    it("returns false when most taught letters have no mastery data", () => {
      const ids = firstNIds(p1Lessons, 15);
      // No entities at all → all "introduced" → below 70%
      expect(isPhaseCompetent(1, ids, {}, today)).toBe(false);
    });

    it("counts retained as competent", () => {
      const ids = firstNIds(p1Lessons, 15);
      const taught = getTaughtLetters(p1Lessons, 15);
      const entities = {};
      for (const id of taught) {
        entities[`letter:${id}`] = {
          correct: 12, attempts: 14, sessionStreak: 4, intervalDays: 14,
          nextReview: "2026-04-09", lastSeen: "2026-03-25",
        };
      }
      expect(isPhaseCompetent(1, ids, entities, today)).toBe(true);
    });

    it("threshold is exactly 70%", () => {
      expect(PHASE_MASTERY_FRACTION).toBe(0.7);
    });

    it("passes at exactly the fraction boundary", () => {
      const ids = firstNIds(p1Lessons, 15);
      const taught = getTaughtLetters(p1Lessons, 15);
      // Need ceil(taught.length * 0.7) accurate
      const needed = Math.ceil(taught.length * PHASE_MASTERY_FRACTION);
      const entities = {};
      for (let i = 0; i < taught.length; i++) {
        if (i < needed) {
          entities[`letter:${taught[i]}`] = { correct: 8, attempts: 10, sessionStreak: 2, intervalDays: 3, lastSeen: "2026-03-25" };
        } else {
          entities[`letter:${taught[i]}`] = { correct: 1, attempts: 5, sessionStreak: 0, intervalDays: 1, lastSeen: "2026-03-25" };
        }
      }
      expect(isPhaseCompetent(1, ids, entities, today)).toBe(true);
    });
  });

  describe("isLessonUnlocked with mastery", () => {
    it("Phase 2 lesson blocked without mastery despite enough completed lessons", () => {
      const ids = firstNIds(p1Lessons, 15);
      // Find the first Phase 2 lesson index
      const p2FirstIdx = LESSONS.findIndex(l => l.phase === 2);
      // Unstable mastery → should block
      const taught = getTaughtLetters(p1Lessons, 15);
      const entities = makeUnstableEntities(taught);
      expect(isLessonUnlocked(p2FirstIdx, ids, entities, today)).toBe(false);
    });

    it("Phase 2 lesson unlocked with enough completed lessons AND mastery", () => {
      const ids = firstNIds(p1Lessons, 15);
      const p2FirstIdx = LESSONS.findIndex(l => l.phase === 2);
      const taught = getTaughtLetters(p1Lessons, 15);
      const entities = makeAccurateEntities(taught);
      expect(isLessonUnlocked(p2FirstIdx, ids, entities, today)).toBe(true);
    });

    it("Phase 2 still blocked if not enough completed lessons even with good mastery", () => {
      const ids = firstNIds(p1Lessons, 5); // only 5, need 15
      const p2FirstIdx = LESSONS.findIndex(l => l.phase === 2);
      const entities = makeAccurateEntities([1, 2, 3, 4, 5]);
      expect(isLessonUnlocked(p2FirstIdx, ids, entities, today)).toBe(false);
    });

    it("within-phase lessons still use previous-lesson completion", () => {
      // Lesson 2 requires lesson 1 completed — no mastery check
      expect(isLessonUnlocked(1, [1], {}, today)).toBe(true);
      expect(isLessonUnlocked(1, [], {}, today)).toBe(false);
    });

    it("backward compatible: no entities passed → old behavior", () => {
      const ids = firstNIds(p1Lessons, 15);
      const p2FirstIdx = LESSONS.findIndex(l => l.phase === 2);
      // No entities → falls back to lesson-count only
      expect(isLessonUnlocked(p2FirstIdx, ids)).toBe(true);
    });
  });

  describe("isPhase2Unlocked / isPhase3Unlocked with mastery", () => {
    it("isPhase2Unlocked requires mastery when entities provided", () => {
      const ids = firstNIds(p1Lessons, 15);
      const taught = getTaughtLetters(p1Lessons, 15);
      expect(isPhase2Unlocked(ids, makeUnstableEntities(taught), today)).toBe(false);
      expect(isPhase2Unlocked(ids, makeAccurateEntities(taught), today)).toBe(true);
    });

    it("isPhase3Unlocked requires mastery when entities provided", () => {
      // Need 12 P2 lessons + mastery of P2 taught letters
      const p2Ids = firstNIds(p2Lessons, 12);
      const taught = getTaughtLetters(p2Lessons, 12);
      expect(isPhase3Unlocked(p2Ids, makeUnstableEntities(taught), today)).toBe(false);
      expect(isPhase3Unlocked(p2Ids, makeAccurateEntities(taught), today)).toBe(true);
    });
  });
});
