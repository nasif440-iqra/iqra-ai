import { LESSONS } from "../data/lessons.js";
import { isLessonUnlocked } from "./progress.js";
import { parseEntityKey, deriveMasteryState, ERROR_CATEGORIES } from "./mastery.js";

/** Derived: count of completed lessons. */
export function getLessonsCompletedCount(completedLessonIds) {
  return completedLessonIds.length;
}

/** Derived: last completed lesson object (or null). */
export function getLastCompletedLesson(completedLessonIds) {
  if (!completedLessonIds.length) return null;
  const lastId = Math.max(...completedLessonIds);
  return LESSONS.find(l => l.id === lastId) || null;
}

export function getCurrentLesson(completedLessonIds) {
  return LESSONS.find(l => !completedLessonIds.includes(l.id)) || LESSONS[LESSONS.length - 1];
}

/** Returns the first lesson that is not completed AND actually unlocked. */
export function getCurrentUnlockedLesson(completedLessonIds, entities, today) {
  for (let i = 0; i < LESSONS.length; i++) {
    const l = LESSONS[i];
    if (completedLessonIds.includes(l.id)) continue;
    if (isLessonUnlocked(i, completedLessonIds, entities, today)) return l;
  }
  // All done or nothing unlocked — fall back to last lesson
  return LESSONS[LESSONS.length - 1];
}

export function getLearnedLetterIds(completedLessonIds) {
  return [...new Set(
    LESSONS.filter(l => completedLessonIds.includes(l.id)).flatMap(l => l.teachIds || [])
  )];
}

export function getPhaseCounts(completedLessonIds) {
  const p1 = LESSONS.filter(l => l.phase === 1);
  const p2 = LESSONS.filter(l => l.phase === 2);
  const p3 = LESSONS.filter(l => l.phase === 3);
  const p4 = LESSONS.filter(l => l.phase === 4);
  return {
    p1Done: p1.filter(l => completedLessonIds.includes(l.id)).length,
    p2Done: p2.filter(l => completedLessonIds.includes(l.id)).length,
    p3Done: p3.filter(l => completedLessonIds.includes(l.id)).length,
    p4Done: p4.filter(l => completedLessonIds.includes(l.id)).length,
    p1Total: p1.length,
    p2Total: p2.length,
    p3Total: p3.length,
    p4Total: p4.length,
  };
}

/** Compute daily goal from onboardingDailyGoal value (canonical, passed from state). */
export function getDailyGoal(onboardingDailyGoal) {
  if (!onboardingDailyGoal) return 1;
  const minutes = parseInt(onboardingDailyGoal, 10);
  if (isNaN(minutes)) return 1;
  // "3" -> 1, "5" -> 1, "10" -> 2
  return Math.max(1, Math.round(minutes / 5));
}

export function getCurrentPhase(completedLessonIds) {
  const current = getCurrentLesson(completedLessonIds);
  return current.phase;
}

export function getDueLetters(progress, today) {
  return Object.entries(progress)
    .filter(([id, entry]) => {
      if (!entry?.nextReview) return false;
      if (!entry?.lastSeen) return false;
      return entry.nextReview <= today;
    })
    .map(([id]) => parseInt(id, 10));
}

// ── Review planner (mastery-aware) ──

/** Entity keys whose SRS nextReview is today or earlier. */
export function getDueEntityKeys(entities, today) {
  if (!entities) return [];
  return Object.entries(entities)
    .filter(([, e]) => e?.nextReview && e?.lastSeen && e.nextReview <= today)
    .map(([key]) => key);
}

/** Entity keys with accuracy below threshold (weak). Requires minimum attempts. */
export function getWeakEntityKeys(entities, { minAttempts = 3, accuracyThreshold = 0.6 } = {}) {
  if (!entities) return [];
  return Object.entries(entities)
    .filter(([, e]) => {
      if (!e || e.attempts < minAttempts) return false;
      return (e.correct / e.attempts) < accuracyThreshold;
    })
    .map(([key]) => key);
}

// ── Mastery state selectors ──

/**
 * Derive mastery states for all entities.
 * Returns a Map-like object: { "letter:2": "accurate", "combo:ba-fatha": "introduced", ... }
 */
export function getEntityMasteryStates(entities, today) {
  if (!entities) return {};
  const states = {};
  for (const [key, entry] of Object.entries(entities)) {
    states[key] = deriveMasteryState(entry, today);
  }
  return states;
}

/**
 * Count entities by mastery state.
 * Returns { introduced: N, unstable: N, accurate: N, retained: N }
 */
export function getMasteryStateCounts(entities, today) {
  const counts = { introduced: 0, unstable: 0, accurate: 0, retained: 0 };
  if (!entities) return counts;
  for (const entry of Object.values(entities)) {
    const state = deriveMasteryState(entry, today);
    counts[state]++;
  }
  return counts;
}

/**
 * Get entity keys that are in a specific mastery state.
 */
export function getEntitiesByMasteryState(entities, state, today) {
  if (!entities) return [];
  return Object.entries(entities)
    .filter(([, entry]) => deriveMasteryState(entry, today) === state)
    .map(([key]) => key);
}

/** Top N confusion pairs sorted by count descending. Returns [{ key, count, lastSeen }]. */
export function getTopConfusions(confusions, limit = 5) {
  if (!confusions) return [];
  return Object.entries(confusions)
    .map(([key, val]) => ({ key, count: val.count, lastSeen: val.lastSeen }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Aggregate error category counts across all confusion entries.
 * Returns { visual_confusion: N, sound_confusion: N, vowel_confusion: N, random_miss: N, total: N }
 */
export function getErrorCategorySummary(confusions) {
  const summary = { visual_confusion: 0, sound_confusion: 0, vowel_confusion: 0, random_miss: 0, total: 0 };
  if (!confusions) return summary;
  for (const entry of Object.values(confusions)) {
    if (entry.categories) {
      for (const [cat, count] of Object.entries(entry.categories)) {
        if (cat in summary) {
          summary[cat] += count;
          summary.total += count;
        }
      }
    }
  }
  return summary;
}

/**
 * Build a review session plan from mastery state.
 * Pulls from: due items, unstable items, weak items, and confused pairs.
 * Returns { due, unstable, weak, confused, items, totalItems, hasReviewWork, isUrgent }
 */
export function planReviewSession(mastery, today, { maxItems = 12 } = {}) {
  const due = getDueEntityKeys(mastery.entities, today);
  const unstable = getEntitiesByMasteryState(mastery.entities, "unstable", today);
  const weak = getWeakEntityKeys(mastery.entities);
  const confused = getTopConfusions(mastery.confusions, 5);

  // Deduplicate: due first, then unstable, then weak, then confused
  const picked = new Set();
  const addUpTo = (keys, limit) => {
    for (const k of keys) {
      if (picked.size >= limit) break;
      picked.add(k);
    }
  };

  addUpTo(due, maxItems);
  addUpTo(unstable, maxItems);
  addUpTo(weak, maxItems);

  // Extract entity keys from confusion pairs (both sides)
  const confusedEntityKeys = [];
  for (const c of confused) {
    const parts = c.key.split("->");
    if (parts.length === 2) {
      // e.g. "recognition:2->3" → extract entities from after the colon
      const prefix = c.key.split(":")[0]; // "recognition", "sound", "harakat"
      const left = parts[0].includes(":") ? parts[0].split(":").slice(1).join(":") : parts[0];
      const right = parts[1];
      if (prefix === "harakat") {
        confusedEntityKeys.push(`combo:${left}`, `combo:${right}`);
      } else {
        const leftNum = parseInt(left, 10);
        const rightNum = parseInt(right, 10);
        if (!isNaN(leftNum)) confusedEntityKeys.push(`letter:${leftNum}`);
        if (!isNaN(rightNum)) confusedEntityKeys.push(`letter:${rightNum}`);
      }
    }
  }
  addUpTo(confusedEntityKeys, maxItems);

  const totalItems = picked.size;

  // Review is "urgent" when there are enough items to warrant priority attention:
  // 4+ items, or any unstable items (mastery below threshold after real attempts)
  const isUrgent = totalItems >= 4 || unstable.length > 0;

  return {
    due,
    unstable,
    weak,
    confused,
    items: [...picked],
    totalItems,
    hasReviewWork: totalItems > 0,
    isUrgent,
  };
}

/**
 * Extract review items from entity keys, split by type.
 * Returns { letterIds: number[], comboIds: string[] }
 */
export function extractReviewItems(entityKeys) {
  const letterIds = new Set();
  const comboIds = new Set();
  for (const key of entityKeys) {
    const parsed = parseEntityKey(key);
    if (parsed.type === "letter" && typeof parsed.rawId === "number" && !isNaN(parsed.rawId)) {
      letterIds.add(parsed.rawId);
    } else if (parsed.type === "combo" && typeof parsed.rawId === "string") {
      comboIds.add(parsed.rawId);
    }
  }
  return { letterIds: [...letterIds], comboIds: [...comboIds] };
}

/**
 * Build a safe lesson override object for a review session.
 * Supports both letter and combo entities.
 * Returns null only when nothing is truly reviewable.
 */
export function buildReviewLessonPayload(mastery, completedLessonIds, today) {
  const plan = planReviewSession(mastery, today);
  const { letterIds, comboIds } = extractReviewItems(plan.items);

  // Fallback: if planner returned no letters, try legacy due letters
  if (letterIds.length === 0) {
    const legacyEntries = {};
    for (const [key, val] of Object.entries(mastery.entities || {})) {
      const parsed = parseEntityKey(key);
      if (parsed.type === "letter" && typeof parsed.rawId === "number" && !isNaN(parsed.rawId)) {
        legacyEntries[String(parsed.rawId)] = val;
      }
    }
    const legacyDue = getDueLetters(legacyEntries, today);
    if (legacyDue.length > 0) {
      letterIds.push(...legacyDue);
    }
  }

  // Return null only when truly nothing is reviewable
  if (letterIds.length === 0 && comboIds.length === 0) return null;

  const totalItems = letterIds.length + comboIds.length;
  return {
    id: "review",
    phase: getCurrentPhase(completedLessonIds),
    lessonMode: "review",
    title: "Review Session",
    description: `${totalItems} item${totalItems !== 1 ? "s" : ""} to practice`,
    teachIds: letterIds,
    teachCombos: comboIds.length > 0 ? comboIds : undefined,
    reviewIds: [],
    familyRule: "Practice what you've already learned.",
  };
}
