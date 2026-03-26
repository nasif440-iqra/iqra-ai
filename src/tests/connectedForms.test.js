import { describe, it, expect } from "vitest";
import { generateConnectedFormExercises } from "../lib/questions/connectedForms.js";
import { generateConnectedReadingExercises } from "../lib/questions/connectedReading.js";

// ── Helpers ──

function makeLesson(overrides = {}) {
  return {
    id: 100,
    phase: 4,
    lessonMode: "connected-forms",
    lessonType: "lesson",
    module: "4.1",
    teachIds: [2, 3],
    reviewIds: [],
    familyRule: null,
    ...overrides,
  };
}

// ── generateConnectedFormExercises ──

describe("generateConnectedFormExercises", () => {
  describe("standard lesson", () => {
    it("returns a non-empty array", () => {
      const lesson = makeLesson({ teachIds: [2] });
      const result = generateConnectedFormExercises(lesson);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes a guided_reveal exercise for each taught letter", () => {
      const lesson = makeLesson({ teachIds: [2, 3] });
      const result = generateConnectedFormExercises(lesson);
      const reveals = result.filter(e => e.type === "guided_reveal");
      expect(reveals.length).toBe(2);
      expect(reveals[0].letterId).toBe(2);
      expect(reveals[1].letterId).toBe(3);
    });

    it("guided_reveal has required fields", () => {
      const lesson = makeLesson({ teachIds: [5] });
      const result = generateConnectedFormExercises(lesson);
      const reveal = result.find(e => e.type === "guided_reveal");
      expect(reveal).toBeDefined();
      expect(reveal.letterId).toBe(5);
      expect(reveal.revealUpTo).toBe("final");
      expect(typeof reveal.explanation).toBe("string");
      expect(reveal.explanation.length).toBeGreaterThan(0);
    });

    it("includes a comprehension exercise for each taught letter", () => {
      const lesson = makeLesson({ teachIds: [2, 3] });
      const result = generateConnectedFormExercises(lesson);
      const comps = result.filter(e => e.type === "comprehension");
      expect(comps.length).toBeGreaterThan(0);
    });

    it("comprehension exercise has valid options with exactly one correct", () => {
      const lesson = makeLesson({ teachIds: [2] });
      const result = generateConnectedFormExercises(lesson);
      const comp = result.find(e => e.type === "comprehension");
      expect(comp).toBeDefined();
      expect(Array.isArray(comp.options)).toBe(true);
      expect(comp.options.length).toBeGreaterThanOrEqual(2);
      const correct = comp.options.filter(o => o.isCorrect);
      expect(correct.length).toBe(1);
    });

    it("generates at least 10 exercises for family lessons", () => {
      const lesson = makeLesson({ module: "4.2", teachIds: [2, 3, 4] });
      const result = generateConnectedFormExercises(lesson);
      // Family: 3 guided + 3 contrast + 2 position + 2 mixed + 2-3 review
      expect(result.length).toBeGreaterThanOrEqual(10);
    });

    it("includes family contrast exercises for multi-letter lessons", () => {
      const lesson = makeLesson({ module: "4.2", teachIds: [2, 3, 4] });
      const result = generateConnectedFormExercises(lesson);
      const contrasts = result.filter(e =>
        e.type === "comprehension" && e.prompt === "Which letter is this in its connected form?"
      );
      expect(contrasts.length).toBeGreaterThanOrEqual(2);
    });

    it("generates at least 8 exercises for single-letter lessons", () => {
      const lesson = makeLesson({ module: "4.1", teachIds: [2] });
      const result = generateConnectedFormExercises(lesson);
      // Single-letter: 1 guided + 2 position + 2 reverse + 1 context + 2 free + 2-3 review
      expect(result.length).toBeGreaterThanOrEqual(8);
    });

    it("works for non-connector letters (e.g. Alif id=1)", () => {
      const lesson = makeLesson({ teachIds: [1] });
      const result = generateConnectedFormExercises(lesson);
      const reveal = result.find(e => e.type === "guided_reveal");
      expect(reveal).toBeDefined();
      expect(reveal.explanation).toContain("only connects on the right");
    });

    it("works for connector letters (e.g. Ba id=2)", () => {
      const lesson = makeLesson({ teachIds: [2] });
      const result = generateConnectedFormExercises(lesson);
      const reveal = result.find(e => e.type === "guided_reveal");
      expect(reveal.explanation).toContain("connects on both sides");
    });

    it("includes review questions for modules 4.1–4.17", () => {
      const lesson = makeLesson({ module: "4.1", teachIds: [2] });
      const result = generateConnectedFormExercises(lesson);
      const reviews = result.filter(e =>
        e.type === "comprehension" && e.prompt.startsWith("Review:")
      );
      expect(reviews.length).toBeGreaterThanOrEqual(2);
    });

    it("does NOT include review questions for module 4.0", () => {
      const lesson = makeLesson({ module: "4.0" });
      const result = generateConnectedFormExercises(lesson);
      const reviews = result.filter(e =>
        e.type === "comprehension" && typeof e.prompt === "string" && e.prompt.startsWith("Review:")
      );
      expect(reviews.length).toBe(0);
    });

    it("does NOT include review questions for module 4.20", () => {
      const lesson = makeLesson({ module: "4.20" });
      const result = generateConnectedFormExercises(lesson);
      const reviews = result.filter(e =>
        e.type === "comprehension" && typeof e.prompt === "string" && e.prompt.startsWith("Review:")
      );
      expect(reviews.length).toBe(0);
    });

    it("review questions have exactly one correct option", () => {
      const lesson = makeLesson({ module: "4.2", teachIds: [2, 3, 4] });
      const result = generateConnectedFormExercises(lesson);
      const reviews = result.filter(e =>
        e.type === "comprehension" && e.prompt.startsWith("Review:")
      );
      for (const r of reviews) {
        const correct = r.options.filter(o => o.isCorrect);
        expect(correct.length).toBe(1);
      }
    });
  });

  describe("RTL lesson (module 4.0)", () => {
    it("returns exercises with tap_in_order type", () => {
      const lesson = makeLesson({ module: "4.0" });
      const result = generateConnectedFormExercises(lesson);
      const tapOrders = result.filter(e => e.type === "tap_in_order");
      expect(tapOrders.length).toBeGreaterThan(0);
    });

    it("tap_in_order exercises have a letters array", () => {
      const lesson = makeLesson({ module: "4.0" });
      const result = generateConnectedFormExercises(lesson);
      const tapOrder = result.find(e => e.type === "tap_in_order");
      expect(tapOrder).toBeDefined();
      expect(Array.isArray(tapOrder.letters)).toBe(true);
      expect(tapOrder.letters.length).toBeGreaterThan(0);
    });

    it("tap_in_order letters have id, arabic, and sound fields", () => {
      const lesson = makeLesson({ module: "4.0" });
      const result = generateConnectedFormExercises(lesson);
      const tapOrder = result.find(e => e.type === "tap_in_order");
      for (const letter of tapOrder.letters) {
        expect(letter).toHaveProperty("id");
        expect(letter).toHaveProperty("arabic");
        expect(letter).toHaveProperty("sound");
      }
    });

    it("includes a direction comprehension question", () => {
      const lesson = makeLesson({ module: "4.0" });
      const result = generateConnectedFormExercises(lesson);
      const comp = result.find(e => e.type === "comprehension");
      expect(comp).toBeDefined();
      expect(comp.prompt).toContain("direction");
      const correct = comp.options.find(o => o.isCorrect);
      expect(correct.id).toBe("rtl");
    });

    it("returns exactly 3 exercises", () => {
      const lesson = makeLesson({ module: "4.0" });
      const result = generateConnectedFormExercises(lesson);
      expect(result.length).toBe(3);
    });
  });

  describe("spot the break lesson (module 4.18)", () => {
    it("returns spot_the_break exercises", () => {
      const lesson = makeLesson({ module: "4.18", teachIds: [1, 8, 9, 10, 11, 27] });
      const result = generateConnectedFormExercises(lesson);
      const breaks = result.filter(e => e.type === "spot_the_break");
      expect(breaks.length).toBeGreaterThan(0);
    });

    it("spot_the_break exercises have word, segments, and breakerLetterId", () => {
      const lesson = makeLesson({ module: "4.18", teachIds: [1, 8, 9, 10, 11, 27] });
      const result = generateConnectedFormExercises(lesson);
      const breakEx = result.find(e => e.type === "spot_the_break");
      expect(breakEx).toBeDefined();
      expect(breakEx.word).toBeDefined();
      expect(breakEx.word.arabic).toBeDefined();
      expect(breakEx.word.transliteration).toBeDefined();
      expect(Array.isArray(breakEx.segments)).toBe(true);
      expect(breakEx.segments.length).toBeGreaterThanOrEqual(2);
      expect(typeof breakEx.breakerLetterId).toBe("number");
      expect(typeof breakEx.explanation).toBe("string");
    });

    it("spot_the_break segments have isBreakAfter field", () => {
      const lesson = makeLesson({ module: "4.18", teachIds: [1, 8, 9, 10, 11, 27] });
      const result = generateConnectedFormExercises(lesson);
      const breakExercises = result.filter(e => e.type === "spot_the_break");
      for (const ex of breakExercises) {
        for (const seg of ex.segments) {
          expect(seg).toHaveProperty("arabic");
          expect(seg).toHaveProperty("isBreakAfter");
          expect(typeof seg.isBreakAfter).toBe("boolean");
        }
        // Exactly one segment should have isBreakAfter: true
        const breakers = ex.segments.filter(s => s.isBreakAfter);
        expect(breakers.length).toBe(1);
      }
    });
  });

  describe("mixed retrieval lesson (module 4.19)", () => {
    it("returns comprehension exercises", () => {
      const lesson = makeLesson({ module: "4.19", teachIds: [2, 5, 12] });
      const result = generateConnectedFormExercises(lesson);
      const comps = result.filter(e => e.type === "comprehension");
      expect(comps.length).toBeGreaterThan(0);
    });

    it("comprehension exercises identify letters from their forms", () => {
      const lesson = makeLesson({ module: "4.19", teachIds: [2, 3] });
      const result = generateConnectedFormExercises(lesson);
      expect(result.length).toBe(lesson.teachIds.length);
      for (const ex of result) {
        expect(ex.type).toBe("comprehension");
        expect(ex).toHaveProperty("displayArabic");
        expect(typeof ex.displayArabic).toBe("string");
      }
    });
  });

  describe("mastery check lesson (module 4.20)", () => {
    it("returns exactly 12 exercises", () => {
      const lesson = makeLesson({ module: "4.20" });
      const result = generateConnectedFormExercises(lesson);
      expect(result.length).toBe(12);
    });

    it("all exercises are comprehension type", () => {
      const lesson = makeLesson({ module: "4.20" });
      const result = generateConnectedFormExercises(lesson);
      for (const ex of result) {
        expect(ex.type).toBe("comprehension");
      }
    });

    it("each exercise has exactly one correct option", () => {
      const lesson = makeLesson({ module: "4.20" });
      const result = generateConnectedFormExercises(lesson);
      for (const ex of result) {
        const correct = ex.options.filter(o => o.isCorrect);
        expect(correct.length).toBe(1);
      }
    });
  });
});

// ── generateConnectedReadingExercises ──

describe("generateConnectedReadingExercises", () => {
  function makeReadingLesson(overrides = {}) {
    return {
      id: 200,
      phase: 5,
      lessonMode: "connected-reading",
      lessonType: "lesson",
      module: "5.1",
      teachIds: [2, 3, 4],
      reviewIds: [],
      ...overrides,
    };
  }

  it("returns a non-empty array", () => {
    const lesson = makeReadingLesson();
    const result = generateConnectedReadingExercises(lesson);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty array when fewer than 2 teachIds", () => {
    const lesson = makeReadingLesson({ teachIds: [2] });
    const result = generateConnectedReadingExercises(lesson);
    expect(result).toEqual([]);
  });

  it("returns empty array when teachIds is empty", () => {
    const lesson = makeReadingLesson({ teachIds: [] });
    const result = generateConnectedReadingExercises(lesson);
    expect(result).toEqual([]);
  });

  it("includes buildup_pair exercises with segments array", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const buildups = result.filter(e => e.type === "buildup_pair");
    expect(buildups.length).toBeGreaterThan(0);
    const first = buildups[0];
    expect(Array.isArray(first.segments)).toBe(true);
    expect(first.segments.length).toBe(2);
  });

  it("buildup_pair segments have arabic, sound, and letterId fields", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const buildup = result.find(e => e.type === "buildup_pair");
    for (const seg of buildup.segments) {
      expect(seg).toHaveProperty("arabic");
      expect(seg).toHaveProperty("sound");
      expect(seg).toHaveProperty("letterId");
      expect(typeof seg.arabic).toBe("string");
      expect(typeof seg.sound).toBe("string");
    }
  });

  it("buildup_pair has fullWord with arabic, transliteration, and ttsText", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const buildup = result.find(e => e.type === "buildup_pair");
    expect(buildup).toHaveProperty("fullWord");
    expect(buildup.fullWord).toHaveProperty("arabic");
    expect(buildup.fullWord).toHaveProperty("transliteration");
    expect(buildup.fullWord).toHaveProperty("ttsText");
  });

  it("buildup_pair has a non-empty explanation string", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const buildup = result.find(e => e.type === "buildup_pair");
    expect(typeof buildup.explanation).toBe("string");
    expect(buildup.explanation.length).toBeGreaterThan(0);
    expect(buildup.explanation).toContain("right to left");
  });

  it("includes free_read exercises", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const freeReads = result.filter(e => e.type === "free_read");
    expect(freeReads.length).toBeGreaterThan(0);
  });

  it("free_read exercises have arabic and transliteration fields", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const freeRead = result.find(e => e.type === "free_read");
    expect(freeRead).toBeDefined();
    expect(freeRead).toHaveProperty("arabic");
    expect(freeRead).toHaveProperty("transliteration");
    expect(freeRead).toHaveProperty("ttsText");
  });

  it("includes a comprehension exercise", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const comp = result.find(e => e.type === "comprehension");
    expect(comp).toBeDefined();
  });

  it("comprehension exercise has exactly one correct option", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const comp = result.find(e => e.type === "comprehension");
    const correct = comp.options.filter(o => o.isCorrect);
    expect(correct.length).toBe(1);
  });

  it("comprehension exercise has at least 2 options", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const comp = result.find(e => e.type === "comprehension");
    expect(comp.options.length).toBeGreaterThanOrEqual(2);
  });

  it("comprehension displayArabic is a non-empty string", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const comp = result.find(e => e.type === "comprehension");
    expect(typeof comp.displayArabic).toBe("string");
    expect(comp.displayArabic.length).toBeGreaterThan(0);
  });

  it("buildup exercises are limited to at most 4", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3, 4, 5, 6] });
    const result = generateConnectedReadingExercises(lesson);
    const buildups = result.filter(e => e.type === "buildup_pair");
    expect(buildups.length).toBeLessThanOrEqual(4);
  });

  it("works with different vowels — segments contain vowel marks", () => {
    const lesson = makeReadingLesson({ teachIds: [2, 3] });
    const result = generateConnectedReadingExercises(lesson);
    const buildup = result.find(e => e.type === "buildup_pair");
    // Each segment arabic should contain a vowel mark (fatha/kasra/damma)
    const vowelMarks = ["\u064E", "\u0650", "\u064F"];
    for (const seg of buildup.segments) {
      const hasVowel = vowelMarks.some(m => seg.arabic.includes(m));
      expect(hasVowel).toBe(true);
    }
  });
});
