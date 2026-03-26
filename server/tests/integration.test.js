import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  insertWord,
  queryWords,
  getWordById,
  getWordsBySurah,
} from "../words-query.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "..", "schema.sql");
const SEED_PATH = path.join(__dirname, "..", "..", "data", "seed", "words-al-ikhlas.json");

// ── Setup ────────────────────────────────────────────────────────────────────

let db;
let seedWords;

beforeAll(() => {
  // Load seed data
  seedWords = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));

  // Create an in-memory SQLite database and apply the schema
  db = new Database(":memory:");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  // Insert all seed words (provide defaults for optional fields not in seed data)
  for (const word of seedWords) {
    insertWord(db, {
      audio_word: null,
      audio_syllables: null,
      ...word,
    });
  }
});

// ── Al-Ikhlas seed data integrity ────────────────────────────────────────────

describe("Al-Ikhlas seed data integrity", () => {
  it("contains exactly 15 words", () => {
    expect(seedWords.length).toBe(15);
  });

  it("words are ordered by ayah and position (ayah*100+position is monotonically increasing)", () => {
    const keys = seedWords.map((w) => w.ayah_number * 100 + w.word_position);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).toBeGreaterThan(keys[i - 1]);
    }
  });

  it("first word is 'qul' (Say)", () => {
    expect(seedWords[0].transliteration).toBe("qul");
    expect(seedWords[0].english_meaning).toBe("Say");
  });

  it("every word has a non-empty letter_breakdown array", () => {
    for (const word of seedWords) {
      expect(Array.isArray(word.letter_breakdown)).toBe(true);
      expect(word.letter_breakdown.length).toBeGreaterThan(0);
    }
  });

  it("every letter_breakdown entry has required fields: letter_id (number), position (valid value), tajweed_rules (array)", () => {
    const validPositions = new Set(["isolated", "initial", "medial", "final"]);
    for (const word of seedWords) {
      for (const entry of word.letter_breakdown) {
        expect(typeof entry.letter_id).toBe("number");
        expect(validPositions.has(entry.position)).toBe(true);
        expect(Array.isArray(entry.tajweed_rules)).toBe(true);
      }
    }
  });

  it("difficulty tiers are all between 1 and 5", () => {
    for (const word of seedWords) {
      expect(word.difficulty_tier).toBeGreaterThanOrEqual(1);
      expect(word.difficulty_tier).toBeLessThanOrEqual(5);
    }
  });
});

// ── Query pipeline with real seed data ───────────────────────────────────────

describe("Query pipeline with real seed data", () => {
  it("Phase 5 words are simple 2-3 letter words (letter_breakdown.length <= 3)", () => {
    const phase5Words = queryWords(db, { maxPhase: 5 });
    // Filter to only those with min_phase exactly 5
    const exactPhase5 = phase5Words.filter((w) => w.min_phase === 5);
    expect(exactPhase5.length).toBeGreaterThan(0);
    for (const word of exactPhase5) {
      expect(word.letter_breakdown.length).toBeLessThanOrEqual(3);
    }
  });

  it("high-frequency words sort first (default ordering)", () => {
    const words = queryWords(db, {});
    expect(words.length).toBeGreaterThan(1);
    for (let i = 1; i < words.length; i++) {
      expect(words[i - 1].quran_frequency).toBeGreaterThanOrEqual(
        words[i].quran_frequency
      );
    }
  });

  it("can filter by skill bucket — results all contain the bucket", () => {
    const bucket = "al_recognition";
    const words = queryWords(db, { skillBucket: bucket });
    expect(words.length).toBeGreaterThan(0);
    for (const word of words) {
      expect(word.skill_buckets).toContain(bucket);
    }
  });

  it("can filter by suitable type — results all contain the type", () => {
    const type = "buildup";
    const words = queryWords(db, { suitableType: type });
    expect(words.length).toBeGreaterThan(0);
    for (const word of words) {
      expect(word.suitable_types).toContain(type);
    }
  });

  it("getWordById returns a fully parsed word with all JSON fields as arrays", () => {
    // Get the id of the first inserted word (qul)
    const allWords = getWordsBySurah(db, 112);
    expect(allWords.length).toBeGreaterThan(0);

    const firstWord = allWords[0];
    expect(firstWord).not.toBeNull();

    // All JSON fields should be parsed arrays
    expect(Array.isArray(firstWord.prerequisite_letter_ids)).toBe(true);
    expect(Array.isArray(firstWord.prerequisite_symbols)).toBe(true);
    expect(Array.isArray(firstWord.suitable_types)).toBe(true);
    expect(Array.isArray(firstWord.skill_buckets)).toBe(true);
    expect(Array.isArray(firstWord.letter_breakdown)).toBe(true);

    // Fetch by id and verify same result
    const byId = getWordById(db, firstWord.id);
    expect(byId).not.toBeNull();
    expect(byId.transliteration).toBe(firstWord.transliteration);
    expect(Array.isArray(byId.prerequisite_letter_ids)).toBe(true);
    expect(Array.isArray(byId.prerequisite_symbols)).toBe(true);
    expect(Array.isArray(byId.suitable_types)).toBe(true);
    expect(Array.isArray(byId.skill_buckets)).toBe(true);
    expect(Array.isArray(byId.letter_breakdown)).toBe(true);
  });
});
