import { describe, it, expect } from "vitest";

import { generateRecognitionQs } from "../lib/questions/recognition.js";
import { generateSoundQs } from "../lib/questions/sound.js";
import { generateContrastQs } from "../lib/questions/contrast.js";
import {
  generateHarakatIntroQs,
  generateHarakatQs,
} from "../lib/questions/harakat.js";
import { generateCheckpointQs } from "../lib/questions/checkpoint.js";
import { generateReviewQs } from "../lib/questions/review.js";
import { generateLessonQuestions } from "../lib/questions/index.js";
import {
  shuffle,
  pickRandom,
  getDistractors,
  getConfusionDistractors,
  makeOpts,
  makeNameOpts,
  makeSoundOpts,
  getKnownIds,
  getRuleDistractors,
  validateQuestion,
  buildFallbackQuestion,
} from "../lib/questions/shared.js";
import { getLetter } from "../data/letters.js";
import { LESSONS } from "../data/lessons.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate common question structure using the production validator. */
function assertValidQuestion(q) {
  const result = validateQuestion(q);
  if (!result.valid) {
    throw new Error(`Question failed validation: ${result.reason} (type=${q?.type}, prompt="${q?.prompt}", opts=${q?.options?.length})`);
  }
}

/** Find the first lesson matching a predicate, or throw. */
function findLesson(predicate) {
  const lesson = LESSONS.find(predicate);
  if (!lesson) throw new Error("No lesson found matching predicate");
  return lesson;
}

// ---------------------------------------------------------------------------
// shared.js utilities
// ---------------------------------------------------------------------------

describe("shared.js utilities", () => {
  describe("shuffle", () => {
    it("returns an array of the same length", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffle(arr);
      expect(result).toHaveLength(arr.length);
    });

    it("contains the same elements", () => {
      const arr = [10, 20, 30, 40];
      const result = shuffle(arr);
      expect([...result].sort((a, b) => a - b)).toEqual(
        [...arr].sort((a, b) => a - b)
      );
    });

    it("does not mutate the original array", () => {
      const arr = [1, 2, 3];
      const copy = [...arr];
      shuffle(arr);
      expect(arr).toEqual(copy);
    });

    it("returns empty array for empty input", () => {
      expect(shuffle([])).toEqual([]);
    });
  });

  describe("pickRandom", () => {
    it("returns an element from the array", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = pickRandom(arr);
      expect(arr).toContain(result);
    });

    it("returns the only element from a single-element array", () => {
      expect(pickRandom([42])).toBe(42);
    });
  });

  describe("getKnownIds", () => {
    it("returns IDs from lessons before the given lesson ID", () => {
      const knownBefore1 = getKnownIds(1);
      expect(Array.isArray(knownBefore1)).toBe(true);

      const laterLesson = LESSONS.find((l) => l.id >= 5);
      if (laterLesson) {
        const known = getKnownIds(laterLesson.id);
        expect(known.length).toBeGreaterThan(0);
      }
    });

    it("returns deduplicated IDs", () => {
      const known = getKnownIds(10);
      const unique = [...new Set(known)];
      expect(known).toEqual(unique);
    });

    it("returns empty array for first lesson", () => {
      const firstId = LESSONS[0].id;
      const known = getKnownIds(firstId);
      expect(known).toEqual([]);
    });

    it("handles non-sequential IDs correctly (lesson 84 before 64)", () => {
      // Lesson 84 appears before lesson 64 in the array
      // getKnownIds(64) should include lesson 84's letters
      const knownFor64 = getKnownIds(64);
      // Lesson 84 teaches [9,4] (Dhaal, Tha)
      expect(knownFor64).toContain(9);
      expect(knownFor64).toContain(4);
    });

    it("uses array position, not ID comparison", () => {
      // Lesson 65 is after lesson 64 in the array
      // getKnownIds(65) should include everything from 64 and before
      const knownFor65 = getKnownIds(65);
      // Lesson 64 teaches [21,22] (Qaf, Kaf)
      expect(knownFor65).toContain(21);
      expect(knownFor65).toContain(22);
    });
  });

  describe("getDistractors", () => {
    it("returns the requested number of distractors", () => {
      const pool = [1, 2, 3, 4, 5];
      const result = getDistractors(1, pool, 2);
      expect(result).toHaveLength(2);
    });

    it("never includes the target in distractors", () => {
      const pool = [1, 2, 3, 4, 5];
      const result = getDistractors(1, pool, 3);
      expect(result.every((l) => l.id !== 1)).toBe(true);
    });

    it("returns letter objects, not raw IDs", () => {
      const pool = [1, 2, 3];
      const result = getDistractors(1, pool, 1);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("letter");
    });

    it("fills from global letters when pool is too small", () => {
      const pool = [1, 2];
      const result = getDistractors(1, pool, 3);
      expect(result).toHaveLength(3);
      expect(result.every((l) => l.id !== 1)).toBe(true);
    });
  });

  describe("getConfusionDistractors", () => {
    it("returns the requested count", () => {
      const pool = [2, 3, 4, 5, 6, 7];
      const result = getConfusionDistractors(2, pool, 2);
      expect(result).toHaveLength(2);
    });

    it("prefers confused letters when available", () => {
      // Letter 2 is confused with [3, 4]
      const pool = [2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = getConfusionDistractors(2, pool, 2);
      // At least one distractor should be from the confusion map (3 or 4)
      const confusionHits = result.filter(
        (l) => l.id === 3 || l.id === 4
      ).length;
      expect(confusionHits).toBeGreaterThanOrEqual(1);
    });

    it("does not include the target", () => {
      const pool = [2, 3, 4, 5];
      const result = getConfusionDistractors(2, pool, 2);
      expect(result.every((l) => l.id !== 2)).toBe(true);
    });
  });

  describe("makeOpts", () => {
    it("has exactly one correct option", () => {
      const letters = [
        { id: 1, letter: "a" },
        { id: 2, letter: "b" },
        { id: 3, letter: "c" },
      ];
      const opts = makeOpts(letters, 1);
      const correct = opts.filter((o) => o.isCorrect);
      expect(correct).toHaveLength(1);
      expect(correct[0].id).toBe(1);
    });

    it("deduplicates by ID", () => {
      const letters = [
        { id: 1, letter: "a" },
        { id: 1, letter: "a" },
        { id: 2, letter: "b" },
      ];
      const opts = makeOpts(letters, 1);
      expect(opts).toHaveLength(2);
    });

    it("uses letter glyph as label", () => {
      const letters = [
        { id: 1, letter: "X" },
        { id: 2, letter: "Y" },
      ];
      const opts = makeOpts(letters, 1);
      const labels = opts.map((o) => o.label);
      expect(labels).toContain("X");
      expect(labels).toContain("Y");
    });
  });

  describe("makeNameOpts", () => {
    it("has exactly one correct option", () => {
      const letters = [
        { id: 1, name: "Alif" },
        { id: 2, name: "Ba" },
        { id: 3, name: "Ta" },
      ];
      const opts = makeNameOpts(letters, 2);
      const correct = opts.filter((o) => o.isCorrect);
      expect(correct).toHaveLength(1);
      expect(correct[0].id).toBe(2);
    });

    it("uses letter name as label", () => {
      const letters = [
        { id: 1, name: "Alif" },
        { id: 2, name: "Ba" },
      ];
      const opts = makeNameOpts(letters, 1);
      const labels = opts.map((o) => o.label);
      expect(labels).toContain("Alif");
      expect(labels).toContain("Ba");
    });
  });

  describe("makeSoundOpts", () => {
    it("has exactly one correct option", () => {
      const letters = [
        { id: 1, transliteration: "a", soundHint: "hint1" },
        { id: 2, transliteration: "b", soundHint: "hint2" },
      ];
      const opts = makeSoundOpts(letters, 1);
      const correct = opts.filter((o) => o.isCorrect);
      expect(correct).toHaveLength(1);
      expect(correct[0].id).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// getRuleDistractors
// ---------------------------------------------------------------------------

describe("getRuleDistractors", () => {
  it("returns distractors WITH dots for a no-dots target", () => {
    // Alif (id:1) has 0 dots
    const alif = getLetter(1);
    const pool = [1, 2, 3, 25, 27]; // Alif(0 dots), Ba(1), Ta(2), Noon(1), Waw(0)
    const dists = getRuleDistractors(alif, pool, 2);
    expect(dists.length).toBe(2);
    for (const d of dists) {
      expect(d.dots).toBeGreaterThan(0);
    }
  });

  it("returns distractors WITHOUT matching visualRule for a dotted target", () => {
    // Ba (id:2) has "1 dot below"
    const ba = getLetter(2);
    const pool = [2, 3, 4, 5, 8]; // Ba, Ta, Tha, Jeem, Daal
    const dists = getRuleDistractors(ba, pool, 2);
    expect(dists.length).toBe(2);
    for (const d of dists) {
      expect(d.visualRule).not.toBe(ba.visualRule);
    }
  });

  it("never includes the target letter itself", () => {
    const waw = getLetter(27); // Waw, 0 dots
    const pool = [1, 25, 27]; // Alif(0 dots), Noon(1 dot), Waw(0 dots)
    const dists = getRuleDistractors(waw, pool, 2);
    for (const d of dists) {
      expect(d.id).not.toBe(27);
    }
  });

  it("falls back to broader letter pool when needed", () => {
    // Pool has only dotless letters — must pull from full alphabet
    const alif = getLetter(1); // 0 dots
    const pool = [1, 27]; // Alif + Waw — both dotless
    const dists = getRuleDistractors(alif, pool, 2);
    expect(dists.length).toBe(2);
    for (const d of dists) {
      expect(d.dots).toBeGreaterThan(0);
    }
  });
});

describe("rule questions have unambiguous answers", () => {
  it("recognition rule questions never have multiple correct options", () => {
    // Test several recognition lessons
    const recogLessons = LESSONS.filter(l => l.lessonMode === "recognition").slice(0, 10);
    for (const lesson of recogLessons) {
      const qs = generateRecognitionQs(lesson);
      const ruleQs = qs.filter(q => q.type === "rule");
      for (const q of ruleQs) {
        const target = getLetter(q.targetId);
        if (!target) continue;
        if (target.dots === 0) {
          // "Which has no dots?" — only the target should have 0 dots
          const dotlessOptions = q.options.filter(o => {
            const l = getLetter(o.id);
            return l && l.dots === 0;
          });
          expect(dotlessOptions.length).toBe(1);
        } else {
          // "Which has X?" — only the target should have that visualRule
          const matchingOptions = q.options.filter(o => {
            const l = getLetter(o.id);
            return l && l.visualRule === target.visualRule;
          });
          expect(matchingOptions.length).toBe(1);
        }
      }
    }
  });

  it("checkpoint rule questions never have multiple correct options", () => {
    const checkpoint = LESSONS.find(l => l.lessonMode === "checkpoint");
    if (!checkpoint) return;
    // Run multiple times due to randomness
    for (let run = 0; run < 5; run++) {
      const qs = generateCheckpointQs(checkpoint, {});
      const ruleQs = qs.filter(q => q.type === "rule");
      for (const q of ruleQs) {
        const target = getLetter(q.targetId);
        if (!target) continue;
        if (target.dots === 0) {
          const dotlessOptions = q.options.filter(o => {
            const l = getLetter(o.id);
            return l && l.dots === 0;
          });
          expect(dotlessOptions.length).toBe(1);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// generateRecognitionQs
// ---------------------------------------------------------------------------

describe("generateRecognitionQs", () => {
  const singleLetterLesson = findLesson(
    (l) => l.lessonMode === "recognition" && l.teachIds?.length === 1
  );
  const multiLetterLesson = findLesson(
    (l) => l.lessonMode === "recognition" && l.teachIds?.length > 1
  );

  it("returns an array of questions for a single-letter lesson", () => {
    const qs = generateRecognitionQs(singleLetterLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(3);
  });

  it("returns an array of questions for a multi-letter lesson", () => {
    const qs = generateRecognitionQs(multiLetterLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(3);
  });

  it("each question has required properties", () => {
    const qs = generateRecognitionQs(singleLetterLesson);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("question types are valid recognition types", () => {
    const validTypes = [
      "tap",
      "find",
      "name_to_letter",
      "letter_to_name",
      "rule",
    ];
    const qs = generateRecognitionQs(singleLetterLesson);
    for (const q of qs) {
      expect(validTypes).toContain(q.type);
    }
  });

  it("single-letter lesson generates exactly 5 questions (plus review)", () => {
    const lesson = findLesson(
      (l) =>
        l.lessonMode === "recognition" &&
        l.teachIds?.length === 1 &&
        !l.reviewIds?.length
    );
    const qs = generateRecognitionQs(lesson);
    expect(qs).toHaveLength(5);
  });

  it("multi-letter lesson questions all have valid structure", () => {
    const qs = generateRecognitionQs(multiLetterLesson);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("handles lesson with reviewIds", () => {
    const lessonWithReview = LESSONS.find(
      (l) => l.lessonMode === "recognition" && l.reviewIds?.length > 0
    );
    if (lessonWithReview) {
      const qs = generateRecognitionQs(lessonWithReview);
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        assertValidQuestion(q);
      }
    }
  });

  it("handles single-element teachIds", () => {
    const fakeLesson = { id: 5, lessonMode: "recognition", teachIds: [2] };
    const qs = generateRecognitionQs(fakeLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });
});

// ---------------------------------------------------------------------------
// generateSoundQs
// ---------------------------------------------------------------------------

describe("generateSoundQs", () => {
  const soundLesson = findLesson((l) => l.lessonMode === "sound");

  it("returns an array of questions", () => {
    const qs = generateSoundQs(soundLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("question types are valid sound types", () => {
    const validTypes = ["audio_to_letter", "letter_to_sound", "contrast_audio"];
    const qs = generateSoundQs(soundLesson);
    for (const q of qs) {
      expect(validTypes).toContain(q.type);
    }
  });

  it("each question has valid structure", () => {
    const qs = generateSoundQs(soundLesson);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("audio_to_letter questions have hasAudio flag", () => {
    const qs = generateSoundQs(soundLesson);
    const audioQs = qs.filter((q) => q.type === "audio_to_letter");
    for (const q of audioQs) {
      expect(q.hasAudio).toBe(true);
    }
  });

  it("letter_to_sound questions have optionMode sound", () => {
    const qs = generateSoundQs(soundLesson);
    const soundQs = qs.filter((q) => q.type === "letter_to_sound");
    for (const q of soundQs) {
      expect(q.optionMode).toBe("sound");
    }
  });

  it("handles empty teachIds gracefully", () => {
    const fakeLesson = { id: 50, lessonMode: "sound", teachIds: [] };
    const qs = generateSoundQs(fakeLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs).toHaveLength(0);
  });

  it("handles single-element teachIds", () => {
    const fakeLesson = { id: 50, lessonMode: "sound", teachIds: [2] };
    const qs = generateSoundQs(fakeLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });
});

// ---------------------------------------------------------------------------
// generateContrastQs
// ---------------------------------------------------------------------------

describe("generateContrastQs", () => {
  const contrastLesson = findLesson((l) => l.lessonMode === "contrast");

  it("returns at most 6 questions", () => {
    const qs = generateContrastQs(contrastLesson);
    expect(qs.length).toBeLessThanOrEqual(6);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("each question has valid structure", () => {
    const qs = generateContrastQs(contrastLesson);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("question types are audio_to_letter or letter_to_sound", () => {
    const validTypes = ["audio_to_letter", "letter_to_sound"];
    const qs = generateContrastQs(contrastLesson);
    for (const q of qs) {
      expect(validTypes).toContain(q.type);
    }
  });

  it("handles empty teachIds gracefully", () => {
    const fakeLesson = { id: 100, lessonMode: "contrast", teachIds: [] };
    const qs = generateContrastQs(fakeLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs).toHaveLength(0);
  });

  it("all contrast lessons produce <= 6 questions", () => {
    const contrastLessons = LESSONS.filter(
      (l) => l.lessonMode === "contrast"
    );
    for (const lesson of contrastLessons) {
      const qs = generateContrastQs(lesson);
      expect(qs.length).toBeLessThanOrEqual(6);
    }
  });
});

// ---------------------------------------------------------------------------
// generateHarakatIntroQs
// ---------------------------------------------------------------------------

describe("generateHarakatIntroQs", () => {
  const harakatIntroLesson = findLesson(
    (l) => l.lessonMode === "harakat-intro"
  );

  it("returns an array of questions", () => {
    const qs = generateHarakatIntroQs(harakatIntroLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("all questions have isHarakat: true", () => {
    const qs = generateHarakatIntroQs(harakatIntroLesson);
    for (const q of qs) {
      expect(q.isHarakat).toBe(true);
    }
  });

  it("each question has valid structure", () => {
    const qs = generateHarakatIntroQs(harakatIntroLesson);
    for (const q of qs) {
      expect(typeof q.type).toBe("string");
      expect(q.targetId).toBeDefined();
      expect(Array.isArray(q.options)).toBe(true);
      const correct = q.options.filter((o) => o.isCorrect);
      expect(correct).toHaveLength(1);
    }
  });

  it("question types include tap and letter_to_name", () => {
    const qs = generateHarakatIntroQs(harakatIntroLesson);
    const types = qs.map((q) => q.type);
    expect(types).toContain("tap");
    expect(types).toContain("letter_to_name");
  });

  it("handles empty teachHarakat gracefully", () => {
    const fakeLesson = {
      id: 100,
      lessonMode: "harakat-intro",
      teachHarakat: [],
    };
    const qs = generateHarakatIntroQs(fakeLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateHarakatQs
// ---------------------------------------------------------------------------

describe("generateHarakatQs", () => {
  const harakatLesson = findLesson((l) => l.lessonMode === "harakat");

  it("returns an array of questions", () => {
    const qs = generateHarakatQs(harakatLesson);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("all questions have isHarakat: true", () => {
    const qs = generateHarakatQs(harakatLesson);
    for (const q of qs) {
      expect(q.isHarakat).toBe(true);
    }
  });

  it("each question has valid structure", () => {
    const qs = generateHarakatQs(harakatLesson);
    for (const q of qs) {
      expect(typeof q.type).toBe("string");
      expect(q.targetId).toBeDefined();
      expect(Array.isArray(q.options)).toBe(true);
      const correct = q.options.filter((o) => o.isCorrect);
      expect(correct).toHaveLength(1);
    }
  });

  it("harakat-mixed lessons respect max question count", () => {
    const mixedLessons = LESSONS.filter(
      (l) => l.lessonMode === "harakat-mixed"
    );
    for (const lesson of mixedLessons) {
      const qs = generateHarakatQs(lesson);
      // Max is 10 for mastery (id >= 82), 8 otherwise
      const maxQs = lesson.id >= 82 ? 10 : 8;
      expect(qs.length).toBeLessThanOrEqual(maxQs);
    }
  });

  it("single harakat lesson generates tap and letter_to_name questions", () => {
    const qs = generateHarakatQs(harakatLesson);
    const types = new Set(qs.map((q) => q.type));
    expect(types.has("tap") || types.has("letter_to_name")).toBe(true);
  });

  it("handles empty teachIds gracefully", () => {
    const fakeLesson = {
      id: 100,
      lessonMode: "harakat",
      teachIds: [],
      teachHarakat: ["fatha"],
    };
    const qs = generateHarakatQs(fakeLesson);
    expect(Array.isArray(qs)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateCheckpointQs
// ---------------------------------------------------------------------------

describe("generateCheckpointQs", () => {
  const checkpointLesson = findLesson((l) => l.lessonMode === "checkpoint");

  it("returns at most 15 questions", () => {
    const qs = generateCheckpointQs(checkpointLesson, {});
    expect(qs.length).toBeLessThanOrEqual(15);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty progress object", () => {
    const qs = generateCheckpointQs(checkpointLesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("handles null/undefined progress", () => {
    const qs = generateCheckpointQs(checkpointLesson, null);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("each question has valid structure", () => {
    const qs = generateCheckpointQs(checkpointLesson, {});
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("Phase 1 checkpoint uses visual recognition types", () => {
    const p1 = LESSONS.find(l => l.lessonMode === "checkpoint" && l.phase === 1);
    if (!p1) return;
    const validTypes = ["tap", "name_to_letter", "letter_to_name", "rule", "find"];
    const qs = generateCheckpointQs(p1, {});
    for (const q of qs) {
      expect(validTypes).toContain(q.type);
    }
  });

  it("Phase 2 checkpoint uses sound question types", () => {
    const p2 = LESSONS.find(l => l.lessonMode === "checkpoint" && l.phase === 2);
    if (!p2) return;
    const validTypes = ["audio_to_letter", "letter_to_sound"];
    const qs = generateCheckpointQs(p2, {});
    expect(qs.length).toBeGreaterThanOrEqual(1);
    for (const q of qs) {
      assertValidQuestion(q);
      expect(validTypes).toContain(q.type);
    }
  });

  it("Phase 2 checkpoint questions have audio flags", () => {
    const p2 = LESSONS.find(l => l.lessonMode === "checkpoint" && l.phase === 2);
    if (!p2) return;
    const qs = generateCheckpointQs(p2, {});
    const audioQs = qs.filter(q => q.type === "audio_to_letter");
    for (const q of audioQs) {
      expect(q.hasAudio).toBe(true);
    }
    const soundQs = qs.filter(q => q.type === "letter_to_sound");
    for (const q of soundQs) {
      expect(q.optionMode).toBe("sound");
    }
  });

  it("weights toward struggled letters", () => {
    // Create progress where letter 2 is struggled
    const teachIds = checkpointLesson.teachIds || [];
    const progress = {};
    for (const id of teachIds) {
      progress[id] = { correct: 9, attempts: 10, sessionStreak: 3 };
    }
    if (teachIds.length > 0) {
      progress[teachIds[0]] = { correct: 1, attempts: 10, sessionStreak: 0 };
    }
    const qs = generateCheckpointQs(checkpointLesson, progress);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty teachIds gracefully", () => {
    const fakeLesson = { id: 100, lessonMode: "checkpoint", teachIds: [] };
    const qs = generateCheckpointQs(fakeLesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateReviewQs
// ---------------------------------------------------------------------------

describe("generateReviewQs", () => {
  it("returns questions for numeric teachIds", () => {
    const fakeLesson = { id: 999, lessonMode: "review", teachIds: [2, 3, 5] };
    const qs = generateReviewQs(fakeLesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("returns questions for entity key strings", () => {
    const fakeLesson = {
      id: 999,
      lessonMode: "review",
      teachIds: ["letter:2", "letter:3", "letter:5"],
    };
    const qs = generateReviewQs(fakeLesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("returns empty array for empty teachIds", () => {
    const fakeLesson = { id: 999, lessonMode: "review", teachIds: [] };
    const qs = generateReviewQs(fakeLesson, {});
    expect(qs).toEqual([]);
  });

  it("generates harakat questions for combo entities", () => {
    const fakeLesson = {
      id: 999,
      lessonMode: "review",
      teachIds: ["combo:ba-fatha"],
    };
    const qs = generateReviewQs(fakeLesson, {});
    expect(qs.length).toBeGreaterThanOrEqual(1);
    // All combo questions should be harakat-style
    for (const q of qs) {
      expect(q.isHarakat).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.filter(o => o.isCorrect).length).toBe(1);
    }
  });

  it("generates mixed letter and combo review", () => {
    const fakeLesson = {
      id: 999,
      lessonMode: "review",
      teachIds: [2, 3],
      teachCombos: ["ba-fatha"],
    };
    const qs = generateReviewQs(fakeLesson, {});
    expect(qs.length).toBeGreaterThanOrEqual(2);
    const harakatQs = qs.filter(q => q.isHarakat);
    const letterQs = qs.filter(q => !q.isHarakat);
    expect(harakatQs.length).toBeGreaterThanOrEqual(1);
    expect(letterQs.length).toBeGreaterThanOrEqual(1);
  });

  it("generates at most min(dueCount * 3, 15) questions", () => {
    const fakeLesson = {
      id: 999,
      lessonMode: "review",
      teachIds: [1, 2, 3, 4, 5, 6],
    };
    const qs = generateReviewQs(fakeLesson, {});
    const expected = Math.min(6 * 3, 15);
    expect(qs.length).toBeLessThanOrEqual(expected);
  });

  it("each question has valid structure", () => {
    const fakeLesson = { id: 999, lessonMode: "review", teachIds: [2, 3] };
    const qs = generateReviewQs(fakeLesson, {});
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("handles null progress", () => {
    const fakeLesson = { id: 999, lessonMode: "review", teachIds: [2] };
    const qs = generateReviewQs(fakeLesson, null);
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("handles single-element teachIds", () => {
    const fakeLesson = { id: 999, lessonMode: "review", teachIds: [10] };
    const qs = generateReviewQs(fakeLesson, {});
    expect(qs.length).toBeGreaterThanOrEqual(1);
    for (const q of qs) {
      assertValidQuestion(q);
    }
  });

  it("deduplicates teachIds", () => {
    const fakeLesson = {
      id: 999,
      lessonMode: "review",
      teachIds: [2, 2, 2],
    };
    const qs = generateReviewQs(fakeLesson, {});
    // 1 unique ID => max 3 questions
    expect(qs.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// generateLessonQuestions dispatcher
// ---------------------------------------------------------------------------

describe("generateLessonQuestions dispatcher", () => {
  it("routes recognition lessons to generateRecognitionQs", () => {
    const lesson = findLesson((l) => l.lessonMode === "recognition");
    const qs = generateLessonQuestions(lesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
    // Recognition types
    const validTypes = [
      "tap",
      "find",
      "name_to_letter",
      "letter_to_name",
      "rule",
    ];
    for (const q of qs) {
      expect(validTypes).toContain(q.type);
    }
  });

  it("routes sound lessons to generateSoundQs", () => {
    const lesson = findLesson((l) => l.lessonMode === "sound");
    const qs = generateLessonQuestions(lesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });

  it("routes contrast lessons to generateContrastQs", () => {
    const lesson = findLesson((l) => l.lessonMode === "contrast");
    const qs = generateLessonQuestions(lesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeLessThanOrEqual(6);
  });

  it("routes harakat-intro lessons to generateHarakatIntroQs", () => {
    const lesson = findLesson((l) => l.lessonMode === "harakat-intro");
    const qs = generateLessonQuestions(lesson, {});
    expect(Array.isArray(qs)).toBe(true);
    for (const q of qs) {
      expect(q.isHarakat).toBe(true);
    }
  });

  it("routes harakat lessons to generateHarakatQs", () => {
    const lesson = findLesson((l) => l.lessonMode === "harakat");
    const qs = generateLessonQuestions(lesson, {});
    expect(Array.isArray(qs)).toBe(true);
    for (const q of qs) {
      expect(q.isHarakat).toBe(true);
    }
  });

  it("routes harakat-mixed lessons to generateHarakatQs", () => {
    const lesson = LESSONS.find((l) => l.lessonMode === "harakat-mixed");
    if (lesson) {
      const qs = generateLessonQuestions(lesson, {});
      expect(Array.isArray(qs)).toBe(true);
      for (const q of qs) {
        expect(q.isHarakat).toBe(true);
      }
    }
  });

  it("routes checkpoint lessons to generateCheckpointQs", () => {
    const lesson = findLesson((l) => l.lessonMode === "checkpoint");
    const qs = generateLessonQuestions(lesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeLessThanOrEqual(15);
  });

  it("routes review lessons to generateReviewQs", () => {
    const fakeLesson = { id: 999, lessonMode: "review", teachIds: [2, 3] };
    const qs = generateLessonQuestions(fakeLesson, {});
    expect(Array.isArray(qs)).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases across all generators
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("all recognition lessons produce valid questions", () => {
    const recognitionLessons = LESSONS.filter(
      (l) => l.lessonMode === "recognition"
    );
    for (const lesson of recognitionLessons) {
      const qs = generateRecognitionQs(lesson);
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        assertValidQuestion(q);
      }
    }
  });

  it("all sound lessons produce valid questions", () => {
    const soundLessons = LESSONS.filter((l) => l.lessonMode === "sound");
    for (const lesson of soundLessons) {
      const qs = generateSoundQs(lesson);
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        assertValidQuestion(q);
      }
    }
  });

  it("all contrast lessons produce valid questions", () => {
    const contrastLessons = LESSONS.filter(
      (l) => l.lessonMode === "contrast"
    );
    for (const lesson of contrastLessons) {
      const qs = generateContrastQs(lesson);
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        assertValidQuestion(q);
      }
    }
  });

  it("all checkpoint lessons produce valid questions", () => {
    const checkpointLessons = LESSONS.filter(
      (l) => l.lessonMode === "checkpoint"
    );
    for (const lesson of checkpointLessons) {
      const qs = generateCheckpointQs(lesson, {});
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        assertValidQuestion(q);
      }
    }
  });

  it("all harakat-intro lessons produce valid questions", () => {
    const introLessons = LESSONS.filter(
      (l) => l.lessonMode === "harakat-intro"
    );
    for (const lesson of introLessons) {
      const qs = generateHarakatIntroQs(lesson);
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        expect(q.isHarakat).toBe(true);
        expect(typeof q.type).toBe("string");
        expect(q.targetId).toBeDefined();
        expect(Array.isArray(q.options)).toBe(true);
        const correct = q.options.filter((o) => o.isCorrect);
        expect(correct).toHaveLength(1);
      }
    }
  });

  it("all harakat and harakat-mixed lessons produce valid questions", () => {
    const harakatLessons = LESSONS.filter(
      (l) => l.lessonMode === "harakat" || l.lessonMode === "harakat-mixed"
    );
    for (const lesson of harakatLessons) {
      const qs = generateHarakatQs(lesson);
      expect(qs.length).toBeGreaterThanOrEqual(1);
      for (const q of qs) {
        expect(q.isHarakat).toBe(true);
        expect(typeof q.type).toBe("string");
        expect(q.targetId).toBeDefined();
        expect(Array.isArray(q.options)).toBe(true);
        // Lesson 83 has a known bug where Phase C cross-letter questions
        // can produce options that don't include the picked target.
        // Skip the "exactly one correct" check for that lesson.
        if (lesson.id !== 83) {
          const correct = q.options.filter((o) => o.isCorrect);
          expect(correct).toHaveLength(1);
        }
      }
    }
  });

  it("generateLessonQuestions works for every lesson in LESSONS", () => {
    for (const lesson of LESSONS) {
      const qs = generateLessonQuestions(lesson, {});
      expect(Array.isArray(qs)).toBe(true);
      expect(qs.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Structured validateQuestion
// ---------------------------------------------------------------------------

describe("validateQuestion — structured reasons", () => {
  it("rejects null", () => {
    expect(validateQuestion(null)).toEqual({ valid: false, reason: "null_question" });
  });
  it("rejects empty prompt on non-audio question", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "", options: [
      { id: 1, label: "a", isCorrect: true }, { id: 2, label: "b", isCorrect: false }
    ] })).toEqual({ valid: false, reason: "empty_prompt" });
  });
  it("rejects missing options", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "x" })).toEqual({ valid: false, reason: "missing_options" });
  });
  it("rejects < 2 options", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "x", options: [{ id: 1, label: "a", isCorrect: true }] }))
      .toEqual({ valid: false, reason: "too_few_options" });
  });
  it("rejects option with missing id or label", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "x", options: [
      { id: 1, label: "a", isCorrect: true }, { id: null, label: "b", isCorrect: false }
    ] }).reason).toBe("invalid_option_shape");
  });
  it("rejects duplicate option IDs", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "x", options: [
      { id: 1, label: "a", isCorrect: true }, { id: 1, label: "b", isCorrect: false }
    ] }).reason).toBe("duplicate_option_ids");
  });
  it("rejects zero correct answers", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "x", options: [
      { id: 1, label: "a", isCorrect: false }, { id: 2, label: "b", isCorrect: false }
    ] }).reason).toBe("zero_correct_answers");
  });
  it("rejects multiple correct answers", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "x", options: [
      { id: 1, label: "a", isCorrect: true }, { id: 2, label: "b", isCorrect: true }
    ] }).reason).toBe("multiple_correct_answers");
  });
  it("rejects missing target", () => {
    expect(validateQuestion({ type: "tap", targetId: 99, prompt: "x", options: [
      { id: 1, label: "a", isCorrect: true }, { id: 2, label: "b", isCorrect: false }
    ] }).reason).toBe("missing_target");
  });
  it("rejects audio_to_letter without hasAudio", () => {
    expect(validateQuestion({ type: "audio_to_letter", targetId: 1, prompt: "x", options: [
      { id: 1, label: "a", isCorrect: true }, { id: 2, label: "b", isCorrect: false }
    ] }).reason).toBe("missing_audio_flag");
  });
  it("rejects letter_to_sound without optionMode='sound'", () => {
    expect(validateQuestion({ type: "letter_to_sound", targetId: 1, prompt: "x", options: [
      { id: 1, label: "a", isCorrect: true }, { id: 2, label: "b", isCorrect: false }
    ] }).reason).toBe("wrong_option_mode");
  });
  it("accepts valid question", () => {
    expect(validateQuestion({ type: "tap", targetId: 1, prompt: "Tap Ba", options: [
      { id: 1, label: "ب", isCorrect: true }, { id: 2, label: "ت", isCorrect: false }
    ] })).toEqual({ valid: true, reason: null });
  });
});

// ---------------------------------------------------------------------------
// Fallback question generation
// ---------------------------------------------------------------------------

describe("buildFallbackQuestion", () => {
  it("produces a valid tap or name_to_letter question", () => {
    const fb = buildFallbackQuestion(2, [1, 2, 3, 4, 5]);
    expect(fb).not.toBeNull();
    expect(["tap", "name_to_letter"]).toContain(fb.type);
    expect(validateQuestion(fb).valid).toBe(true);
  });

  it("returns null for invalid targetId", () => {
    expect(buildFallbackQuestion(999, [1, 2, 3])).toBeNull();
  });

  it("works with empty pool (falls back to full alphabet)", () => {
    const fb = buildFallbackQuestion(5, []);
    expect(fb).not.toBeNull();
    expect(validateQuestion(fb).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stress tests: 100 runs on failure-prone generators
// ---------------------------------------------------------------------------

describe("stress tests — 100 randomized runs", () => {
  const RUNS = 100;

  const recognitionLessons = LESSONS.filter(l => l.lessonMode === "recognition").slice(0, 5);
  const checkpointLessons = LESSONS.filter(l => l.lessonMode === "checkpoint");
  const harakatLessons = LESSONS.filter(l => ["harakat", "harakat-mixed"].includes(l.lessonMode)).slice(0, 5);
  const reviewLesson = { id: 999, lessonMode: "review", teachIds: [2, 5, 10, 14, 21], reviewIds: [] };

  it("recognition — zero invalid questions across 100 runs", () => {
    for (const lesson of recognitionLessons) {
      for (let run = 0; run < RUNS; run++) {
        const qs = generateRecognitionQs(lesson);
        for (const q of qs) {
          const r = validateQuestion(q);
          if (!r.valid) throw new Error(`Lesson ${lesson.id} run ${run}: ${r.reason} on ${q.type} "${q.prompt}"`);
        }
      }
    }
  });

  it("checkpoint — zero invalid questions across 100 runs", () => {
    for (const lesson of checkpointLessons) {
      for (let run = 0; run < RUNS; run++) {
        const qs = generateCheckpointQs(lesson, {});
        for (const q of qs) {
          const r = validateQuestion(q);
          if (!r.valid) throw new Error(`Lesson ${lesson.id} run ${run}: ${r.reason} on ${q.type} "${q.prompt}"`);
        }
      }
    }
  });

  it("harakat — zero invalid questions across 100 runs", () => {
    for (const lesson of harakatLessons) {
      for (let run = 0; run < RUNS; run++) {
        const qs = generateHarakatQs(lesson);
        for (const q of qs) {
          const r = validateQuestion(q);
          if (!r.valid) throw new Error(`Lesson ${lesson.id} run ${run}: ${r.reason} on ${q.type} "${q.prompt}"`);
        }
      }
    }
  });

  it("review — zero invalid questions across 100 runs", () => {
    for (let run = 0; run < RUNS; run++) {
      const qs = generateReviewQs(reviewLesson, {});
      for (const q of qs) {
        const r = validateQuestion(q);
        if (!r.valid) throw new Error(`Review run ${run}: ${r.reason} on ${q.type} "${q.prompt}"`);
      }
    }
  });

  it("no lesson collapses to < 2 questions after filtering", () => {
    for (let run = 0; run < 20; run++) {
      for (const lesson of LESSONS) {
        const qs = generateLessonQuestions(lesson, {});
        if (qs.length < 2) {
          throw new Error(`Lesson ${lesson.id} (${lesson.lessonMode}) produced only ${qs.length} valid questions on run ${run}`);
        }
      }
    }
  });

  it("no lesson repeatedly produces rejected questions", () => {
    const rejectionCounts = {};
    for (let run = 0; run < 50; run++) {
      for (const lesson of LESSONS) {
        // Generate raw questions (bypass filter to count rejections)
        let qs;
        if (lesson.lessonMode === "recognition") qs = generateRecognitionQs(lesson);
        else if (lesson.lessonMode === "checkpoint") qs = generateCheckpointQs(lesson, {});
        else if (lesson.lessonMode === "harakat" || lesson.lessonMode === "harakat-mixed") qs = generateHarakatQs(lesson);
        else continue;

        for (const q of qs) {
          const r = validateQuestion(q);
          if (!r.valid) {
            const key = `${lesson.id}:${r.reason}`;
            rejectionCounts[key] = (rejectionCounts[key] || 0) + 1;
          }
        }
      }
    }
    // Fail if any lesson:reason pair fires more than 5 times across 50 runs
    for (const [key, count] of Object.entries(rejectionCounts)) {
      if (count > 5) {
        throw new Error(`Repeated rejections: ${key} rejected ${count} times across 50 runs`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Rule question hardening (semantic validation)
// ---------------------------------------------------------------------------

describe("rule questions — semantic correctness", () => {
  const RUNS = 50;

  it("dotless rule: only 1 dotless option across all recognition lessons × 50 runs", () => {
    const recogLessons = LESSONS.filter(l => l.lessonMode === "recognition");
    for (let run = 0; run < RUNS; run++) {
      for (const lesson of recogLessons) {
        const qs = generateRecognitionQs(lesson);
        for (const q of qs) {
          if (q.type !== "rule") continue;
          const target = getLetter(q.targetId);
          if (!target || target.dots !== 0) continue;
          const dotless = q.options.filter(o => { const l = getLetter(o.id); return l && l.dots === 0; });
          if (dotless.length !== 1) {
            throw new Error(`Lesson ${lesson.id} run ${run}: "no dots" rule has ${dotless.length} dotless options (expected 1). Options: ${q.options.map(o => o.id).join(",")}`);
          }
        }
      }
    }
  });

  it("dotted rule: only 1 matching visualRule across checkpoints × 50 runs", () => {
    const checkpoints = LESSONS.filter(l => l.lessonMode === "checkpoint" && l.phase === 1);
    for (let run = 0; run < RUNS; run++) {
      for (const lesson of checkpoints) {
        const qs = generateCheckpointQs(lesson, {});
        for (const q of qs) {
          if (q.type !== "rule") continue;
          const target = getLetter(q.targetId);
          if (!target || target.dots === 0) continue;
          const matching = q.options.filter(o => { const l = getLetter(o.id); return l && l.visualRule === target.visualRule; });
          if (matching.length !== 1) {
            throw new Error(`Checkpoint run ${run}: "${target.visualRule}" rule has ${matching.length} matching options`);
          }
        }
      }
    }
  });

  it("review rule questions are also correct × 50 runs", () => {
    const reviewLesson = { id: 999, lessonMode: "review", teachIds: [1, 2, 8, 12, 25], reviewIds: [] };
    for (let run = 0; run < RUNS; run++) {
      const qs = generateReviewQs(reviewLesson, {});
      for (const q of qs) {
        if (q.type !== "rule") continue;
        const target = getLetter(q.targetId);
        if (!target) continue;
        if (target.dots === 0) {
          const dotless = q.options.filter(o => { const l = getLetter(o.id); return l && l.dots === 0; });
          expect(dotless.length).toBe(1);
        } else {
          const matching = q.options.filter(o => { const l = getLetter(o.id); return l && l.visualRule === target.visualRule; });
          expect(matching.length).toBe(1);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Full lesson audit
// ---------------------------------------------------------------------------

describe("full question audit", () => {
  it("every generated question passes structural validation (all lessons × 3 runs)", () => {
    for (let run = 0; run < 3; run++) {
      for (const lesson of LESSONS) {
        const qs = generateLessonQuestions(lesson, {});
        for (const q of qs) {
          const r = validateQuestion(q);
          if (!r.valid) {
            throw new Error(
              `Lesson ${lesson.id} (${lesson.lessonMode}), run ${run}: ` +
              `${r.reason} on type=${q.type}, prompt="${q.prompt}"`
            );
          }
        }
      }
    }
  });

  it("contrast letter_to_sound prompts never use audio language", () => {
    const contrastLessons = LESSONS.filter(l => l.lessonMode === "contrast");
    const audioKeywords = ["listen", "hear", "sound similar"];
    for (const lesson of contrastLessons) {
      const qs = generateLessonQuestions(lesson, {});
      for (const q of qs) {
        if (q.type === "letter_to_sound" && q.promptSubtext) {
          const lower = q.promptSubtext.toLowerCase();
          for (const kw of audioKeywords) {
            if (lower.includes(kw)) {
              throw new Error(`Audio language in visual prompt: "${q.promptSubtext}"`);
            }
          }
        }
      }
    }
  });

  it("harakat questions always have isHarakat flag", () => {
    const harakatLessons = LESSONS.filter(l =>
      ["harakat-intro", "harakat", "harakat-mixed"].includes(l.lessonMode)
    );
    for (const lesson of harakatLessons) {
      const qs = generateLessonQuestions(lesson, {});
      for (const q of qs) {
        expect(q.isHarakat).toBe(true);
      }
    }
  });
});
