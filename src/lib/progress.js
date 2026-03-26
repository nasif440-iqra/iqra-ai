import { LESSONS, PHASE_1_COMPLETION_THRESHOLD, PHASE_2_COMPLETION_THRESHOLD, PHASE_3_COMPLETION_THRESHOLD } from "../data/lessons.js";
import { deriveMasteryState } from "./mastery.js";

const STORAGE_KEY = "tila_progress";
export const PROGRESS_SCHEMA_VERSION = 3;

const VALID_LESSON_IDS = new Set(LESSONS.map(l => l.id));

/** Call from browser console: resetProgress() — wipes saved state so the app starts fresh. */
export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("hasCompletedOnboarding");
  localStorage.removeItem("onboardingIntention");
  localStorage.removeItem("onboardingDailyGoal");
  localStorage.removeItem("lastHadithInterstitialDate");
  location.reload();
}
if (typeof window !== "undefined") window.resetProgress = resetProgress;

/** Call from browser console: unlockAllLessons() — marks every lesson as completed. */
export function unlockAllLessons() {
  const allIds = LESSONS.map(l => l.id);
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = raw ? JSON.parse(raw) : {};
  if (data.lessonCompletion) {
    data.lessonCompletion.completedLessonIds = allIds;
  } else {
    data.lessonCompletion = { completedLessonIds: allIds };
  }
  data.onboarded = true;
  data.onboardingCommitmentComplete = true;
  data.onboardingVersion = 2;
  data.wirdIntroSeen = true;
  data.schemaVersion = PROGRESS_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  location.reload();
}
if (typeof window !== "undefined") window.unlockAllLessons = unlockAllLessons;

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

/** Sanitize completedLessonIds: numeric, deduplicated, valid, sorted */
export function sanitizeCompletedIds(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (typeof id === "number" && VALID_LESSON_IDS.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result.sort((a, b) => a - b);
}

// ── Migration from v0/v1/v2 flat progress to v3 mastery.entities ──

/**
 * Migrate old flat progress map (keyed by numeric IDs) to mastery.entities
 * with normalized "letter:<id>" keys.
 */
export function migrateFlatProgressToEntities(flatProgress) {
  if (!flatProgress || typeof flatProgress !== "object") return {};
  const entities = {};
  for (const [rawId, entry] of Object.entries(flatProgress)) {
    if (!entry || typeof entry !== "object") continue;
    const numId = parseInt(rawId, 10);
    // Numeric keys become letter entities; string keys that look like combos become combo entities
    if (!isNaN(numId)) {
      entities[`letter:${numId}`] = { ...entry };
    } else if (typeof rawId === "string" && rawId.includes("-")) {
      entities[`combo:${rawId}`] = { ...entry };
    }
  }
  return entities;
}

/**
 * Create the empty v3 mastery shape.
 */
export function emptyMastery() {
  return {
    entities: {},
    skills: {},
    confusions: {},
  };
}

/**
 * Create the empty v3 habit shape.
 */
function defaultHabit() {
  return {
    lastPracticeDate: null,
    currentWird: 0,
    longestWird: 0,
    todayLessonCountDate: null,
    todayLessonCount: 0,
  };
}

export function loadProgress() {
  const data = loadRaw();
  const storedVersion = typeof data?.schemaVersion === "number" ? data.schemaVersion : 0;

  // ── Onboarding migration (legacy loose localStorage keys) ──
  let onboarded = data?.onboarded === true;
  let onboardingIntention = typeof data?.onboardingIntention === "string" ? data.onboardingIntention : null;
  let onboardingDailyGoal = typeof data?.onboardingDailyGoal === "string" ? data.onboardingDailyGoal : null;

  if (!onboarded && typeof window !== "undefined" && localStorage.getItem("hasCompletedOnboarding") === "true") {
    onboarded = true;
  }
  if (!onboardingIntention && typeof window !== "undefined") {
    const legacy = localStorage.getItem("onboardingIntention");
    if (legacy) onboardingIntention = legacy;
  }
  if (!onboardingDailyGoal && typeof window !== "undefined") {
    const legacy = localStorage.getItem("onboardingDailyGoal");
    if (legacy) onboardingDailyGoal = legacy;
  }

  // ── Lesson completion ──
  let completedLessonIds;
  if (storedVersion >= 3 && data?.lessonCompletion?.completedLessonIds) {
    completedLessonIds = sanitizeCompletedIds(data.lessonCompletion.completedLessonIds);
  } else {
    completedLessonIds = sanitizeCompletedIds(data?.completedLessonIds);
  }

  // ── Mastery ──
  let mastery;
  if (storedVersion >= 3 && data?.mastery) {
    mastery = {
      entities: (data.mastery.entities && typeof data.mastery.entities === "object") ? data.mastery.entities : {},
      skills: (data.mastery.skills && typeof data.mastery.skills === "object") ? data.mastery.skills : {},
      confusions: (data.mastery.confusions && typeof data.mastery.confusions === "object") ? data.mastery.confusions : {},
    };
  } else {
    // Migrate from v0/v1/v2 flat progress
    const flatProgress = (data?.progress && typeof data.progress === "object") ? data.progress : {};
    mastery = {
      entities: migrateFlatProgressToEntities(flatProgress),
      skills: {},
      confusions: {},
    };
  }

  // ── Habit ──
  let habit;
  if (storedVersion >= 3 && data?.habit) {
    habit = {
      lastPracticeDate: typeof data.habit.lastPracticeDate === "string" ? data.habit.lastPracticeDate : null,
      currentWird: typeof data.habit.currentWird === "number" ? data.habit.currentWird : 0,
      longestWird: typeof data.habit.longestWird === "number" ? data.habit.longestWird : 0,
      todayLessonCountDate: typeof data.habit.todayLessonCountDate === "string" ? data.habit.todayLessonCountDate : null,
      todayLessonCount: typeof data.habit.todayLessonCount === "number" ? data.habit.todayLessonCount : 0,
    };
  } else {
    // Migrate from flat v2 fields
    habit = {
      lastPracticeDate: typeof data?.lastPracticeDate === "string" ? data.lastPracticeDate : null,
      currentWird: typeof data?.currentWird === "number" ? data.currentWird : 0,
      longestWird: typeof data?.longestWird === "number" ? data.longestWird : 0,
      todayLessonCountDate: typeof data?.todayLessonCountDate === "string" ? data.todayLessonCountDate : null,
      todayLessonCount: typeof data?.todayLessonCount === "number" ? data.todayLessonCount : 0,
    };
  }

  // ── New onboarding fields (v2 onboarding) ──
  const onboardingStartingPoint = typeof data?.onboardingStartingPoint === "string" ? data.onboardingStartingPoint : null;
  const onboardingMotivation = typeof data?.onboardingMotivation === "string" ? data.onboardingMotivation : null;
  const onboardingVersion = typeof data?.onboardingVersion === "number" ? data.onboardingVersion : (onboarded ? 1 : 2);
  // Legacy users (v1) who already completed the old onboarding should NOT be
  // routed into the post-lesson commitment flow. Default their commitment to true.
  const onboardingCommitmentComplete = data?.onboardingCommitmentComplete === true || (onboarded && onboardingVersion < 2);
  // Existing users who already have completed lessons should skip the Wird intro
  const wirdIntroSeen = data?.wirdIntroSeen === true || (onboarded && completedLessonIds.length > 0);

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    onboarded,
    onboardingIntention,
    onboardingDailyGoal,
    onboardingStartingPoint,
    onboardingMotivation,
    onboardingCommitmentComplete,
    onboardingVersion,
    wirdIntroSeen,
    completedLessonIds,
    mastery,
    habit,
    // Legacy compat: expose flat "progress" view derived from mastery.entities
    // so existing consumers (LessonScreen, questions) keep working without changes.
    progress: buildLegacyProgressView(mastery.entities),
  };
}

/**
 * Build a flat progress map from mastery.entities for backward-compat consumers.
 * Strips the "letter:" prefix so keys are numeric again.
 */
export function buildLegacyProgressView(entities) {
  const flat = {};
  for (const [key, entry] of Object.entries(entities)) {
    if (key.startsWith("letter:")) {
      const numId = parseInt(key.slice(7), 10);
      if (!isNaN(numId)) flat[numId] = entry;
    }
    // combo entries are not needed in the old flat view
  }
  return flat;
}

/** Returns true on success, false on failure (storage full or unavailable). */
export function saveProgress({ onboarded, onboardingIntention, onboardingDailyGoal, onboardingStartingPoint, onboardingMotivation, onboardingCommitmentComplete, onboardingVersion, wirdIntroSeen, completedLessonIds, mastery, habit }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      onboarded,
      onboardingIntention: onboardingIntention || null,
      onboardingDailyGoal: onboardingDailyGoal || null,
      onboardingStartingPoint: onboardingStartingPoint || null,
      onboardingMotivation: onboardingMotivation || null,
      onboardingCommitmentComplete: onboardingCommitmentComplete || false,
      onboardingVersion: onboardingVersion || 2,
      wirdIntroSeen: wirdIntroSeen || false,
      lessonCompletion: {
        completedLessonIds,
      },
      mastery,
      habit,
    }));
    return true;
  } catch {
    console.error("[Progress] Failed to save — localStorage may be full");
    return false;
  }
}

/** Export all progress data as a JSON string for backup. */
export function exportProgressJSON() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw || "{}";
  } catch {
    return "{}";
  }
}

/** Import progress data from a JSON string. Returns true on success. */
export function importProgressJSON(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (typeof data !== "object" || data === null) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/* ── Date helpers (re-exported from shared module) ── */

export { getTodayDateString, getDayDifference } from "./dateUtils.js";
import { getTodayDateString, getDayDifference } from "./dateUtils.js";

/* ── Wird recalculation on app open ── */

export function recalculateWirdOnAppOpen(habit) {
  const today = getTodayDateString();
  let changed = false;
  let result = { ...habit };

  if (result.todayLessonCountDate !== today) {
    result = { ...result, todayLessonCount: 0, todayLessonCountDate: today };
    changed = true;
  }

  if (!result.lastPracticeDate) return { result, changed };

  const gap = getDayDifference(today, result.lastPracticeDate);

  if (gap <= 1) {
    return { result, changed };
  }

  if (result.currentWird !== 0) {
    result = { ...result, currentWird: 0 };
    changed = true;
  }

  return { result, changed };
}

/* ── Record practice on lesson completion ── */

export function recordPractice(habit) {
  const today = getTodayDateString();
  let result = { ...habit };

  if (result.todayLessonCountDate !== today) {
    result = { ...result, todayLessonCount: 0, todayLessonCountDate: today };
  }

  result = { ...result, todayLessonCount: result.todayLessonCount + 1 };

  if (!result.lastPracticeDate) {
    result = { ...result, lastPracticeDate: today, currentWird: 1, longestWird: Math.max(result.longestWird, 1) };
    return result;
  }

  const gap = getDayDifference(today, result.lastPracticeDate);

  if (gap === 0) {
    result = { ...result, lastPracticeDate: today };
    return result;
  }

  if (gap === 1) {
    const newWird = result.currentWird + 1;
    result = { ...result, lastPracticeDate: today, currentWird: newWird, longestWird: Math.max(result.longestWird, newWird) };
    return result;
  }

  result = { ...result, lastPracticeDate: today, currentWird: 1, longestWird: Math.max(result.longestWird, 1) };
  return result;
}

/* ── SRS (use mastery.js updateEntitySRS — this re-export keeps old imports working) ── */

export { updateEntitySRS as updateLetterSRS } from "./mastery.js";

/* ── Phase helpers ── */

const PHASE_META = {
  1: { title: "Letter Recognition", lessons: LESSONS.filter(l => l.phase === 1) },
  2: { title: "Letter Sounds", lessons: LESSONS.filter(l => l.phase === 2) },
  3: { title: "Harakat (Vowels)", lessons: LESSONS.filter(l => l.phase === 3) },
  4: { title: "Connected Forms", lessons: LESSONS.filter(l => l.phase === 4) },
};

export function getAllPhases() {
  return [1, 2, 3, 4].map(p => ({ phase: p, ...PHASE_META[p] }));
}

export function getPhaseByLessonId(lessonId) {
  const lesson = LESSONS.find(l => l.id === lessonId);
  return lesson ? lesson.phase : null;
}

export function getPhaseProgress(completedLessonIds, phaseNum) {
  const meta = PHASE_META[phaseNum];
  if (!meta) return { total: 0, completed: 0 };
  const completed = meta.lessons.filter(l => completedLessonIds.includes(l.id)).length;
  return { total: meta.lessons.length, completed, title: meta.title };
}

export function getCompletedPhaseIntercept(prevCompletedIds, newCompletedIds) {
  for (const p of [1, 2, 3, 4]) {
    const meta = PHASE_META[p];
    if (!meta || meta.lessons.length === 0) continue;
    const wasDone = meta.lessons.every(l => prevCompletedIds.includes(l.id));
    const nowDone = meta.lessons.every(l => newCompletedIds.includes(l.id));
    if (!wasDone && nowDone) {
      const nextMeta = PHASE_META[p + 1];
      const nextPhase = nextMeta ? { phase: p + 1, title: nextMeta.title } : null;
      return { phase: p, title: meta.title, nextPhase };
    }
  }
  return null;
}

/* ── Zeigarnik momentum copy ── */

export function getPhaseMomentumCopy(completedLessonIds) {
  for (const p of [1, 2, 3, 4]) {
    const meta = PHASE_META[p];
    if (!meta || meta.lessons.length === 0) continue;
    const done = meta.lessons.filter(l => completedLessonIds.includes(l.id)).length;
    const total = meta.lessons.length;

    if (done >= total) continue;

    const remaining = total - done;
    const nextMeta = PHASE_META[p + 1];
    const nextPhase = nextMeta ? nextMeta.title : null;
    const phaseName = meta.title;

    if (done === 0) return null;

    if (remaining === 1) {
      return {
        line1: `One lesson left in ${phaseName}.`,
        line2: nextPhase ? `Finish it to unlock ${nextPhase}.` : "Finish it to complete your journey.",
      };
    }

    if (remaining <= 3) {
      return {
        line1: `You're very close to finishing ${phaseName}.`,
        line2: nextPhase ? `${remaining} lessons left to unlock ${nextPhase}.` : `${remaining} lessons left to complete your journey.`,
      };
    }

    if (done <= 2) {
      return {
        line1: `You've started ${phaseName}.`,
        line2: "Complete a few more lessons to build momentum.",
      };
    }

    return {
      line1: `You're making progress in ${phaseName}.`,
      line2: `${remaining} lessons left to complete this phase.`,
    };
  }

  return null;
}

/**
 * Minimum fraction of taught letters that must be at "accurate" or "retained"
 * mastery state to unlock the next phase.
 */
const PHASE_MASTERY_FRACTION = 0.7;

/**
 * Check if a phase transition meets the mastery competence requirement.
 *
 * @param {number} phase - The phase whose lessons were completed (1 for P1→P2, 2 for P2→P3)
 * @param {number[]} completedLessonIds - All completed lesson IDs
 * @param {object} [entities] - mastery.entities map (null-safe: skips check if unavailable)
 * @param {string} [today] - YYYY-MM-DD for mastery state derivation
 * @returns {boolean}
 */
export function isPhaseCompetent(phase, completedLessonIds, entities, today) {
  // If no mastery data available, fall back to lesson-count only (backward compat)
  if (!entities || !today) return true;

  const phaseLessons = LESSONS.filter(l => l.phase === phase);
  const completedPhaseLessons = phaseLessons.filter(l => completedLessonIds.includes(l.id));

  // Safety valve: if ALL lessons in the phase are completed, don't block retroactively.
  // This protects legacy users who progressed under the old system.
  if (completedPhaseLessons.length >= phaseLessons.length) return true;

  // Collect unique letters taught in the completed lessons of this phase
  const taughtLetters = new Set();
  completedPhaseLessons.forEach(l => (l.teachIds || []).forEach(id => taughtLetters.add(id)));

  if (taughtLetters.size === 0) return true; // nothing to check

  // Count how many taught letters are at accurate or retained
  let competentCount = 0;
  for (const letterId of taughtLetters) {
    const entry = entities[`letter:${letterId}`];
    const state = deriveMasteryState(entry, today);
    if (state === "accurate" || state === "retained") {
      competentCount++;
    }
  }

  return competentCount / taughtLetters.size >= PHASE_MASTERY_FRACTION;
}

export function isLessonUnlocked(lessonIndex, completedLessonIds, entities, today) {
  if (lessonIndex === 0) return true;
  const cur = LESSONS[lessonIndex];
  const prev = LESSONS[lessonIndex - 1];
  if (!cur || !prev) return false;

  if (cur.phase === 2 && prev.phase === 1) {
    const p1Done = LESSONS.filter(l => l.phase === 1 && completedLessonIds.includes(l.id)).length;
    if (p1Done < PHASE_1_COMPLETION_THRESHOLD) return false;
    return isPhaseCompetent(1, completedLessonIds, entities, today);
  }

  if (cur.phase === 3 && prev.phase === 2) {
    const p2Done = LESSONS.filter(l => l.phase === 2 && completedLessonIds.includes(l.id)).length;
    if (p2Done < PHASE_2_COMPLETION_THRESHOLD) return false;
    return isPhaseCompetent(2, completedLessonIds, entities, today);
  }

  if (cur.phase === 4 && prev.phase === 3) {
    const p3Done = LESSONS.filter(l => l.phase === 3 && completedLessonIds.includes(l.id)).length;
    if (p3Done < PHASE_3_COMPLETION_THRESHOLD) return false;
    return isPhaseCompetent(3, completedLessonIds, entities, today);
  }

  return completedLessonIds.includes(prev.id);
}

export function isPhase2Unlocked(completedLessonIds, entities, today) {
  const p1Done = LESSONS.filter(l => l.phase === 1 && completedLessonIds.includes(l.id)).length;
  if (p1Done < PHASE_1_COMPLETION_THRESHOLD) return false;
  return isPhaseCompetent(1, completedLessonIds, entities, today);
}

export function isPhase3Unlocked(completedLessonIds, entities, today) {
  const p2Done = LESSONS.filter(l => l.phase === 2 && completedLessonIds.includes(l.id)).length;
  if (p2Done < PHASE_2_COMPLETION_THRESHOLD) return false;
  return isPhaseCompetent(2, completedLessonIds, entities, today);
}

export function isPhase4Unlocked(completedLessonIds, entities, today) {
  const p3Done = LESSONS.filter(l => l.phase === 3 && completedLessonIds.includes(l.id)).length;
  if (p3Done < PHASE_3_COMPLETION_THRESHOLD) return false;
  return isPhaseCompetent(3, completedLessonIds, entities, today);
}

export { PHASE_MASTERY_FRACTION };
