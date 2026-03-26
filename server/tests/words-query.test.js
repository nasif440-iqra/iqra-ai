import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  insertWord,
  getWordById,
  getWordsBySurah,
  queryWords,
} from "../words-query.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "..", "schema.sql");

// ── Test word fixtures ──────────────────────────────────────────────────────

const WORD_BISMI = {
  arabic_text: "بِسْمِ",
  arabic_plain: "بسم",
  transliteration: "bismi",
  english_meaning: "in the name of",
  root_word: "سمو",
  surah_number: 1,
  ayah_number: 1,
  word_position: 1,
  quran_frequency: 3,
  min_phase: 6,
  prerequisite_letter_ids: [2, 12, 24],
  prerequisite_symbols: ["kasra", "sukoon"],
  difficulty_tier: 3,
  suitable_types: ["buildup", "free_reading"],
  skill_buckets: ["connected_decoding", "symbol_reading"],
  letter_breakdown: [
    { letter_id: 2, form: "initial" },
    { letter_id: 12, form: "medial" },
    { letter_id: 24, form: "final" },
  ],
  audio_word: null,
  audio_syllables: ["بِسْ", "مِ"],
};

const WORD_QUL = {
  arabic_text: "قُلْ",
  arabic_plain: "قل",
  transliteration: "qul",
  english_meaning: "say",
  root_word: "قول",
  surah_number: 112,
  ayah_number: 1,
  word_position: 1,
  quran_frequency: 332,
  min_phase: 5,
  prerequisite_letter_ids: [21, 23],
  prerequisite_symbols: ["damma", "sukoon"],
  difficulty_tier: 2,
  suitable_types: ["buildup", "free_reading", "comprehension"],
  skill_buckets: ["connected_decoding"],
  letter_breakdown: [
    { letter_id: 21, form: "initial" },
    { letter_id: 23, form: "final" },
  ],
  audio_word: null,
  audio_syllables: ["قُلْ"],
};

const WORD_MIN = {
  arabic_text: "مِنْ",
  arabic_plain: "من",
  transliteration: "min",
  english_meaning: "from",
  root_word: null,
  surah_number: 114,
  ayah_number: 1,
  word_position: 1,
  quran_frequency: 1264,
  min_phase: 5,
  prerequisite_letter_ids: [24, 25],
  prerequisite_symbols: ["kasra", "sukoon"],
  difficulty_tier: 1,
  suitable_types: ["buildup", "free_reading"],
  skill_buckets: ["connected_decoding"],
  letter_breakdown: [
    { letter_id: 24, form: "initial" },
    { letter_id: 25, form: "final" },
  ],
  audio_word: null,
  audio_syllables: ["مِنْ"],
};

// ── Setup ───────────────────────────────────────────────────────────────────

let db;
let idBismi, idQul, idMin;

beforeAll(() => {
  // Create an in-memory SQLite database and apply the schema
  db = new Database(":memory:");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  // Insert test words
  idBismi = insertWord(db, WORD_BISMI);
  idQul = insertWord(db, WORD_QUL);
  idMin = insertWord(db, WORD_MIN);
});

// ── insertWord ──────────────────────────────────────────────────────────────

describe("insertWord", () => {
  it("inserts a word and returns a numeric id > 0", () => {
    expect(typeof idBismi).toBe("number");
    expect(idBismi).toBeGreaterThan(0);
    expect(typeof idQul).toBe("number");
    expect(idQul).toBeGreaterThan(0);
    expect(typeof idMin).toBe("number");
    expect(idMin).toBeGreaterThan(0);
  });

  it("assigns distinct ids to distinct words", () => {
    expect(idBismi).not.toBe(idQul);
    expect(idQul).not.toBe(idMin);
  });
});

// ── getWordById ─────────────────────────────────────────────────────────────

describe("getWordById", () => {
  it("returns the correct word with parsed JSON fields", () => {
    const word = getWordById(db, idBismi);
    expect(word).not.toBeNull();
    expect(word.transliteration).toBe("bismi");
    expect(word.surah_number).toBe(1);
    expect(word.min_phase).toBe(6);
    expect(word.difficulty_tier).toBe(3);

    // JSON fields should be parsed arrays/objects
    expect(Array.isArray(word.prerequisite_letter_ids)).toBe(true);
    expect(word.prerequisite_letter_ids).toEqual([2, 12, 24]);

    expect(Array.isArray(word.prerequisite_symbols)).toBe(true);
    expect(word.prerequisite_symbols).toEqual(["kasra", "sukoon"]);

    expect(Array.isArray(word.suitable_types)).toBe(true);
    expect(word.suitable_types).toEqual(["buildup", "free_reading"]);

    expect(Array.isArray(word.skill_buckets)).toBe(true);
    expect(word.skill_buckets).toEqual(["connected_decoding", "symbol_reading"]);

    expect(Array.isArray(word.letter_breakdown)).toBe(true);
    expect(word.letter_breakdown[0]).toEqual({ letter_id: 2, form: "initial" });

    expect(Array.isArray(word.audio_syllables)).toBe(true);
    expect(word.audio_syllables).toEqual(["بِسْ", "مِ"]);
  });

  it("returns null for an unknown id", () => {
    const word = getWordById(db, 99999);
    expect(word).toBeNull();
  });
});

// ── getWordsBySurah ─────────────────────────────────────────────────────────

describe("getWordsBySurah", () => {
  it("returns words for surah 112 with parsed JSON fields", () => {
    const words = getWordsBySurah(db, 112);
    expect(words.length).toBe(1);
    expect(words[0].transliteration).toBe("qul");
    expect(Array.isArray(words[0].skill_buckets)).toBe(true);
  });

  it("returns results ordered by ayah_number then word_position", () => {
    // Insert a second word for surah 112 to verify ordering
    const db2 = new Database(":memory:");
    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
    db2.exec(schema);

    insertWord(db2, { ...WORD_QUL, word_position: 2, arabic_text: "هُوَ", arabic_plain: "هو", transliteration: "huwa", english_meaning: "he", ayah_number: 1 });
    insertWord(db2, { ...WORD_QUL, word_position: 1, arabic_text: "قُلْ2", arabic_plain: "قل2", transliteration: "qul2", english_meaning: "say2", ayah_number: 1 });

    const words = getWordsBySurah(db2, 112);
    expect(words.length).toBe(2);
    // word_position 1 should come before 2
    expect(words[0].word_position).toBeLessThanOrEqual(words[1].word_position);
  });

  it("returns empty array for unknown surah", () => {
    const words = getWordsBySurah(db, 9999);
    expect(words).toEqual([]);
  });
});

// ── queryWords ──────────────────────────────────────────────────────────────

describe("queryWords", () => {
  it("filters by maxPhase — returns words with min_phase <= maxPhase", () => {
    const words = queryWords(db, { maxPhase: 5 });
    expect(words.length).toBe(2);
    const translits = words.map((w) => w.transliteration);
    expect(translits).toContain("qul");
    expect(translits).toContain("min");
    expect(translits).not.toContain("bismi");
  });

  it("filters by maxDifficulty — returns only words with difficulty_tier <= maxDifficulty", () => {
    const words = queryWords(db, { maxDifficulty: 1 });
    expect(words.length).toBe(1);
    expect(words[0].transliteration).toBe("min");
  });

  it("filters by surah", () => {
    const words = queryWords(db, { surah: 114 });
    expect(words.length).toBe(1);
    expect(words[0].transliteration).toBe("min");
  });

  it("filters by skillBucket", () => {
    // All 3 words have connected_decoding; only bismi also has symbol_reading
    const symbolWords = queryWords(db, { skillBucket: "symbol_reading" });
    expect(symbolWords.length).toBe(1);
    expect(symbolWords[0].transliteration).toBe("bismi");

    const decodingWords = queryWords(db, { skillBucket: "connected_decoding" });
    expect(decodingWords.length).toBe(3);
  });

  it("filters by suitableType", () => {
    // Only qul has comprehension type
    const words = queryWords(db, { suitableType: "comprehension" });
    expect(words.length).toBe(1);
    expect(words[0].transliteration).toBe("qul");
  });

  it("filters by containsLetterIds — returns only words containing ALL specified letter ids", () => {
    // letter ids [24, 25] are in WORD_MIN only
    const words = queryWords(db, { containsLetterIds: [24, 25] });
    expect(words.length).toBe(1);
    expect(words[0].transliteration).toBe("min");
  });

  it("filters by containsLetterIds with single letter id", () => {
    // letter id 24 is in both bismi and min
    const words = queryWords(db, { containsLetterIds: [24] });
    expect(words.length).toBe(2);
    const translits = words.map((w) => w.transliteration);
    expect(translits).toContain("bismi");
    expect(translits).toContain("min");
  });

  it("limits results", () => {
    const words = queryWords(db, { limit: 2 });
    expect(words.length).toBe(2);
  });

  it("uses frequency DESC as default ordering", () => {
    // min (1264) > qul (332) > bismi (3)
    const words = queryWords(db, {});
    expect(words[0].quran_frequency).toBeGreaterThanOrEqual(words[1].quran_frequency);
    if (words.length > 2) {
      expect(words[1].quran_frequency).toBeGreaterThanOrEqual(words[2].quran_frequency);
    }
  });

  it("orders by difficulty ASC then frequency DESC when orderBy is 'difficulty'", () => {
    const words = queryWords(db, { orderBy: "difficulty" });
    // min (tier 1), qul (tier 2), bismi (tier 3)
    expect(words[0].difficulty_tier).toBe(1);
    expect(words[1].difficulty_tier).toBe(2);
    expect(words[2].difficulty_tier).toBe(3);
  });

  it("returns empty array when no words match filters", () => {
    const words = queryWords(db, { surah: 9999 });
    expect(words).toEqual([]);
  });

  it("combines multiple filters correctly", () => {
    // maxPhase:5 (qul + min) AND skillBucket:connected_decoding (all 3) AND surah:114 (min)
    const words = queryWords(db, {
      maxPhase: 5,
      skillBucket: "connected_decoding",
      surah: 114,
    });
    expect(words.length).toBe(1);
    expect(words[0].transliteration).toBe("min");
  });

  it("returns parsed JSON fields for all results", () => {
    const words = queryWords(db, { surah: 112 });
    expect(words.length).toBe(1);
    expect(Array.isArray(words[0].prerequisite_letter_ids)).toBe(true);
    expect(Array.isArray(words[0].skill_buckets)).toBe(true);
    expect(Array.isArray(words[0].letter_breakdown)).toBe(true);
    expect(Array.isArray(words[0].audio_syllables)).toBe(true);
  });
});
