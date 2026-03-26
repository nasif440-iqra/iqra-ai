/**
 * Lesson outcome evaluation.
 *
 * Single source of truth for whether a lesson attempt counts as "passed".
 * Separates "attempt recorded" (mastery tracking) from "lesson passed" (progression).
 */

/**
 * Per-mode pass thresholds.
 * null = never gates progression (review sessions).
 */
const MODE_THRESHOLDS = {
  recognition: 0.6,
  sound: 0.6,
  contrast: 0.6,
  checkpoint: 0.7,
  "harakat-intro": 0.5,
  harakat: 0.6,
  "harakat-mixed": 0.6,
  review: null,
};

const DEFAULT_THRESHOLD = 0.6;

/**
 * Get the pass threshold for a given lesson mode.
 * Returns null for modes that never gate progression.
 */
export function getPassThreshold(lessonMode) {
  if (lessonMode in MODE_THRESHOLDS) return MODE_THRESHOLDS[lessonMode];
  return DEFAULT_THRESHOLD;
}

/**
 * Evaluate a lesson attempt.
 *
 * @param {Array} quizResults - array of { correct: boolean, ... }
 * @param {string} lessonMode - "recognition" | "sound" | "contrast" | "checkpoint" | "review" | "harakat" | ...
 * @returns {{ total: number, correct: number, accuracy: number, passed: boolean, threshold: number|null }}
 */
export function evaluateLessonOutcome(quizResults, lessonMode) {
  const total = quizResults.length;
  const correct = quizResults.filter(r => r.correct).length;
  const accuracy = total > 0 ? correct / total : 0;
  const threshold = getPassThreshold(lessonMode);

  // null threshold = mode never gates progression
  if (threshold === null) {
    return { total, correct, accuracy, passed: true, threshold };
  }

  const passed = accuracy >= threshold;
  return { total, correct, accuracy, passed, threshold };
}

export { MODE_THRESHOLDS, DEFAULT_THRESHOLD };
