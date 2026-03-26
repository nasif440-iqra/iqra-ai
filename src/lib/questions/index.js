export { shuffle, pickRandom } from "./shared.js";
export { generateRecognitionQs } from "./recognition.js";
export { generateSoundQs } from "./sound.js";
export { generateContrastQs } from "./contrast.js";
export { generateHarakatIntroQs, generateHarakatQs } from "./harakat.js";
export { getWrongExplanation, getContrastExplanation, getHarakatWrongExplanation } from "./explanations.js";

import { generateRecognitionQs } from "./recognition.js";
import { generateSoundQs } from "./sound.js";
import { generateContrastQs } from "./contrast.js";
import { generateHarakatIntroQs, generateHarakatQs } from "./harakat.js";
import { generateCheckpointQs } from "./checkpoint.js";
import { generateReviewQs } from "./review.js";
import { filterValidQuestions } from "./shared.js";
import { generateConnectedFormExercises } from "./connectedForms.js";
import { generateConnectedReadingExercises } from "./connectedReading.js";

export function generateLessonQuestions(lesson, progress) {
  let qs;
  if (lesson.lessonMode === "checkpoint") qs = generateCheckpointQs(lesson, progress);
  else if (lesson.lessonMode === "review") qs = generateReviewQs(lesson, progress);
  else if (lesson.lessonMode === "contrast") qs = generateContrastQs(lesson);
  else if (lesson.lessonMode === "harakat-intro") qs = generateHarakatIntroQs(lesson);
  else if (lesson.lessonMode === "harakat" || lesson.lessonMode === "harakat-mixed") qs = generateHarakatQs(lesson);
  else if (lesson.lessonMode === "connected-forms") return generateConnectedFormExercises(lesson);
  else qs = lesson.lessonMode === "sound" ? generateSoundQs(lesson) : generateRecognitionQs(lesson);

  // Safeguard: validate every question, replace failures with fallbacks
  return filterValidQuestions(qs, lesson);
}

/**
 * Generate exercises for hybrid (Phase 4+) lessons.
 * These return exercise objects (not quiz questions) for the hybrid lesson framework.
 * Falls back to standard question generation for non-hybrid modes.
 */
export function generateHybridExercises(lesson, progress) {
  if (lesson.lessonMode === "connected-forms") return generateConnectedFormExercises(lesson);
  if (lesson.lessonMode === "connected-reading") return generateConnectedReadingExercises(lesson);
  return generateLessonQuestions(lesson, progress);
}
