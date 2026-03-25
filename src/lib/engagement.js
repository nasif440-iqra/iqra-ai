/**
 * Engagement Layer — centralized microcopy, companion motif helpers,
 * and progression psychology utilities for Iqra AI.
 *
 * All copy is production-quality, calm, premium, and spiritually aligned.
 * No slang, no childish praise, no arcade language.
 */

// ─── Correct answer microcopy (rotating, per-mode) ─────────────────────────

export const CORRECT_COPY = {
  recognition: [
    "That's right.",
    "You got it.",
    "Correct.",
    "Well spotted.",
    "Exactly right.",
    "You see the difference.",
    "Good eye.",
    "That's the one.",
    "Clear and correct.",
  ],
  sound: [
    "You matched it.",
    "Good ear.",
    "That's the sound.",
    "You recognized it.",
    "Right match.",
    "Your ear is learning.",
    "You can hear it now.",
    "Spot on.",
  ],
  harakat: [
    "You read that.",
    "You heard the vowel.",
    "That's the right sound.",
    "You're reading Arabic sounds.",
    "You matched the mark to the sound.",
    "You can hear the difference.",
    "The vowels are making sense.",
    "That's real reading.",
  ],
};

// ─── Near-miss / wrong answer encouragement ─────────────────────────────────

export const WRONG_ENCOURAGEMENT = [
  "That's a common confusion — look closely.",
  "Almost — the details make the difference.",
  "Close one. Take a careful look.",
  "Not quite — but you're learning the distinction.",
  "This is how you build accuracy.",
  "Good attempt — the difference is subtle.",
];

// ─── Streak microcopy ───────────────────────────────────────────────────────

export const STREAK_COPY = {
  default: [
    "Steady progress",
    "Finding your rhythm",
    "Clear and focused",
    "Building momentum",
    "Confident steps",
  ],
  harakat: [
    "Reading naturally",
    "The vowels are clear",
    "Steady ear",
    "Flowing through",
    "Hearing the patterns",
  ],
};

// ─── Mid-quiz encouragement ─────────────────────────────────────────────────

export const MID_CELEBRATE_COPY = {
  default: [
    "The patterns are becoming familiar",
    "You're building real recognition",
    "This is steady progress",
    "You're seeing the details clearly",
    "Keep this pace — it's working",
  ],
  harakat: [
    "You're reading letter-vowel combinations",
    "The marks are becoming clear",
    "You can hear the differences — real progress",
    "These sounds are becoming natural",
    "You're connecting marks to meaning",
  ],
};

// ─── Completion microcopy ───────────────────────────────────────────────────

export const COMPLETION_HEADLINES = {
  firstLesson: "Your first step",
  perfect: "Flawless.",
  great: "Well done.",
  good: "Solid effort.",
  struggling: "Keep going.",
  harakatPerfect: "Every sound, correct.",
  harakatGreat: "Reading with clarity.",
  harakatStruggling: "The sounds take time.",
};

export const COMPLETION_SUBLINES = {
  firstLesson: "You've taken the first step in reading Quran.",
  perfect: "Every answer was precise. That's real learning.",
  great: "Strong understanding. The letters are becoming clear.",
  good: "Each attempt sharpens your recognition. Keep going.",
  struggling: "Every practice session builds familiarity. You'll get there.",
  harakatPerfect: "You matched every mark to its sound.",
  harakatGreat: "The vowels are starting to feel natural.",
  harakatStruggling: "Vowel marks take repetition — keep listening.",
};

// ─── Continuation / unlock copy ─────────────────────────────────────────────

export const CONTINUATION_COPY = [
  "Your next step is ready.",
  "The journey continues.",
  "Ready when you are.",
  "One more step forward.",
  "The next lesson builds on this.",
];

export const UNLOCK_COPY = [
  "You've unlocked the next lesson.",
  "A new lesson is now available.",
  "Your progress has opened a new path.",
];

// ─── Islamic closing quotes (expanded) ──────────────────────────────────────

export const CLOSING_QUOTES = [
  "Whoever takes a path seeking knowledge, Allah makes easy a path to Paradise.",
  "A little each day goes a long way.",
  "The one who reads the Quran beautifully will be with noble angels.",
  "Every letter learned is a step on a beautiful path.",
  "Seeking knowledge is an obligation upon every Muslim.",
  "Read, in the name of your Lord who created.",
  "The best among you are those who learn the Quran and teach it.",
  "He who does not give up hope in His mercy is truly blessed.",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function pickCopy(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns the correct-answer message pool for a given question context.
 */
export function getCorrectPool(isHarakat, isSound) {
  if (isHarakat) return CORRECT_COPY.harakat;
  if (isSound) return CORRECT_COPY.sound;
  return CORRECT_COPY.recognition;
}

/**
 * Returns a completion descriptor based on accuracy and lesson context.
 */
export function getCompletionTier(accuracy, isFirst, isHarakat) {
  if (isFirst) return "firstLesson";
  if (isHarakat) return accuracy === 100 ? "harakatPerfect" : accuracy >= 50 ? "harakatGreat" : "harakatStruggling";
  if (accuracy === 100) return "perfect";
  if (accuracy >= 80) return "great";
  if (accuracy >= 50) return "good";
  return "struggling";
}

// ─── Performance band system ──────────────────────────────────────────────

/**
 * Classify lesson performance into a band for honest summary messaging.
 * Returns "strong" | "partial" | "weak"
 */
export function getPerformanceBand(accuracy) {
  if (accuracy >= 80) return "strong";
  if (accuracy >= 50) return "partial";
  return "weak";
}

/**
 * Get honest summary section heading + recap text based on performance.
 */
export function getSummaryMessaging(lesson, teachLetters, lessonCombos, accuracy) {
  const band = getPerformanceBand(accuracy);
  const mode = lesson.lessonMode;

  // Section heading
  const sectionHeading = band === "strong" ? "What you learned"
    : band === "partial" ? "What you practiced"
    : "Keep reviewing";

  // Recap text — honest about performance
  let recap;
  if (mode === "harakat-intro") {
    recap = band === "strong"
      ? "You learned the three short vowel marks — Fatha, Kasra, and Damma."
      : band === "partial"
      ? "You practiced the three vowel marks — they'll become clearer with repetition."
      : "You started learning Fatha, Kasra, and Damma — keep practicing to build familiarity.";
  } else if (mode === "harakat" || mode === "harakat-mixed") {
    const sounds = lessonCombos.slice(0, 4).map(c => `"${c.sound}"`).join(", ");
    recap = band === "strong"
      ? `You practiced reading: ${sounds}`
      : band === "partial"
      ? `You're getting familiar with: ${sounds}`
      : `You started practicing: ${sounds} — revisit to build confidence.`;
  } else if (mode === "contrast") {
    const names = teachLetters.map(l => l.name).join(" and ");
    recap = band === "strong"
      ? `You learned to distinguish ${names} by sound.`
      : band === "partial"
      ? `You're improving at telling ${names} apart.`
      : `You began practicing ${names} — the difference will click with more practice.`;
  } else if (mode === "sound") {
    const names = teachLetters.map(l => l.name).join(", ");
    recap = band === "strong"
      ? `You connected ${names} to ${teachLetters.length === 1 ? "its" : "their"} sound${teachLetters.length > 1 ? "s" : ""}.`
      : band === "partial"
      ? `You're getting familiar with how ${names} sound${teachLetters.length > 1 ? "" : "s"}.`
      : `You started hearing ${names} — keep listening to build recognition.`;
  } else {
    // recognition
    const names = teachLetters.map(l => l.name).join(", ");
    recap = band === "strong"
      ? `You learned to recognize ${names}.`
      : band === "partial"
      ? `You're improving at recognizing ${names}.`
      : `You've begun practicing ${names} — review again to strengthen recognition.`;
  }

  return { sectionHeading, recap, band };
}

/**
 * Get the recap text summarizing what was learned in this lesson.
 * @deprecated Use getSummaryMessaging() for performance-honest recaps.
 */
export function getLessonRecap(lesson, teachLetters, lessonCombos) {
  return getSummaryMessaging(lesson, teachLetters, lessonCombos, 100).recap;
}
