/**
 * Word database query functions for Tila word bank.
 *
 * All functions accept `db` as their first argument (dependency injection)
 * so tests can pass an in-memory database while production code passes the
 * real singleton from db.js.
 *
 * JSON fields (prerequisite_letter_ids, prerequisite_symbols, suitable_types,
 * skill_buckets, letter_breakdown, audio_syllables) are stored as TEXT in
 * SQLite and are transparently serialized on write / parsed on read.
 */

// ── JSON field names ────────────────────────────────────────────────────────

const JSON_FIELDS = [
  "prerequisite_letter_ids",
  "prerequisite_symbols",
  "suitable_types",
  "skill_buckets",
  "letter_breakdown",
  "audio_syllables",
];

// ── Internal helper ─────────────────────────────────────────────────────────

/**
 * Parses JSON string fields in a raw DB row into JS objects/arrays.
 * Returns a new object (does not mutate the input).
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function parseWordRow(row) {
  if (!row) return null;
  const parsed = { ...row };
  for (const field of JSON_FIELDS) {
    if (typeof parsed[field] === "string") {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        // Leave as-is if parsing fails (should not happen with well-formed data)
      }
    }
  }
  return parsed;
}

// ── insertWord ──────────────────────────────────────────────────────────────

/**
 * Inserts a word into the database.
 * JSON fields are auto-serialized to JSON strings before insertion.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} word — word data matching the `words` table columns
 * @returns {number} lastInsertRowid of the new row
 */
export function insertWord(db, word) {
  // Serialize JSON fields
  const row = { ...word };
  for (const field of JSON_FIELDS) {
    if (row[field] !== undefined && typeof row[field] !== "string") {
      row[field] = JSON.stringify(row[field]);
    }
  }

  const stmt = db.prepare(`
    INSERT INTO words (
      arabic_text,
      arabic_plain,
      transliteration,
      english_meaning,
      root_word,
      surah_number,
      ayah_number,
      word_position,
      quran_frequency,
      min_phase,
      prerequisite_letter_ids,
      prerequisite_symbols,
      difficulty_tier,
      suitable_types,
      skill_buckets,
      letter_breakdown,
      audio_word,
      audio_syllables
    ) VALUES (
      @arabic_text,
      @arabic_plain,
      @transliteration,
      @english_meaning,
      @root_word,
      @surah_number,
      @ayah_number,
      @word_position,
      @quran_frequency,
      @min_phase,
      @prerequisite_letter_ids,
      @prerequisite_symbols,
      @difficulty_tier,
      @suitable_types,
      @skill_buckets,
      @letter_breakdown,
      @audio_word,
      @audio_syllables
    )
  `);

  const result = stmt.run(row);
  return Number(result.lastInsertRowid);
}

// ── getWordById ─────────────────────────────────────────────────────────────

/**
 * Returns a single word by database ID with JSON fields parsed.
 * Returns null if no row exists for the given id.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @returns {object|null}
 */
export function getWordById(db, id) {
  const row = db.prepare("SELECT * FROM words WHERE id = @id").get({ id });
  return parseWordRow(row) ?? null;
}

// ── getWordsBySurah ─────────────────────────────────────────────────────────

/**
 * Returns all words for a surah, ordered by ayah_number then word_position.
 * JSON fields are parsed. Returns an empty array when the surah has no words.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} surahNumber
 * @returns {object[]}
 */
export function getWordsBySurah(db, surahNumber) {
  const rows = db
    .prepare(
      `SELECT * FROM words
       WHERE surah_number = @surahNumber
       ORDER BY ayah_number ASC, word_position ASC`
    )
    .all({ surahNumber });
  return rows.map(parseWordRow);
}

// ── queryWords ──────────────────────────────────────────────────────────────

/**
 * Flexible word query with optional filters.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} filters
 * @param {number}   [filters.maxPhase]         — max min_phase value (inclusive)
 * @param {number}   [filters.maxDifficulty]    — max difficulty_tier value (inclusive)
 * @param {number}   [filters.surah]            — filter by surah_number
 * @param {string}   [filters.skillBucket]      — word must include this in skill_buckets
 * @param {string}   [filters.suitableType]     — word must include this in suitable_types
 * @param {number[]} [filters.containsLetterIds] — word must contain ALL these letter ids
 * @param {number}   [filters.limit=50]         — max results
 * @param {string}   [filters.orderBy="frequency"] — "frequency" (DESC) or "difficulty" (ASC then frequency DESC)
 * @returns {object[]}
 */
export function queryWords(db, filters = {}) {
  const {
    maxPhase,
    maxDifficulty,
    surah,
    skillBucket,
    suitableType,
    containsLetterIds,
    limit = 50,
    orderBy = "frequency",
  } = filters;

  const conditions = [];
  const params = {};

  if (maxPhase !== undefined) {
    conditions.push("min_phase <= @maxPhase");
    params.maxPhase = maxPhase;
  }

  if (maxDifficulty !== undefined) {
    conditions.push("difficulty_tier <= @maxDifficulty");
    params.maxDifficulty = maxDifficulty;
  }

  if (surah !== undefined) {
    conditions.push("surah_number = @surah");
    params.surah = surah;
  }

  if (skillBucket !== undefined) {
    conditions.push(
      `EXISTS (SELECT 1 FROM json_each(skill_buckets) WHERE value = @skillBucket)`
    );
    params.skillBucket = skillBucket;
  }

  if (suitableType !== undefined) {
    conditions.push(
      `EXISTS (SELECT 1 FROM json_each(suitable_types) WHERE value = @suitableType)`
    );
    params.suitableType = suitableType;
  }

  // Each letter id must appear in prerequisite_letter_ids JSON array
  if (containsLetterIds && containsLetterIds.length > 0) {
    containsLetterIds.forEach((letterId, index) => {
      const paramName = `letterId${index}`;
      conditions.push(
        `EXISTS (SELECT 1 FROM json_each(prerequisite_letter_ids) WHERE value = @${paramName})`
      );
      params[paramName] = letterId;
    });
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderClause =
    orderBy === "difficulty"
      ? "ORDER BY difficulty_tier ASC, quran_frequency DESC"
      : "ORDER BY quran_frequency DESC";

  const sql = `
    SELECT * FROM words
    ${whereClause}
    ${orderClause}
    LIMIT @limit
  `;

  params.limit = limit;

  const rows = db.prepare(sql).all(params);
  return rows.map(parseWordRow);
}
