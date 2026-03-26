/**
 * Express Router for Quran word database endpoints.
 *
 * Routes:
 *   GET /api/words                — Query words with optional filters
 *   GET /api/words/surah/:number  — All words for a surah (ordered by ayah/position)
 *   GET /api/words/:id            — Single word by database ID
 *
 * NOTE: /surah/:number MUST be defined before /:id to prevent "surah" being
 * captured as an ID parameter.
 */

import { Router } from "express";
import { getDb } from "./db.js";
import { queryWords, getWordById, getWordsBySurah } from "./words-query.js";

const router = Router();

// ── GET /api/words ───────────────────────────────────────────────────────────
// Query words with optional filters. All query params are optional.
//
// Query params:
//   maxPhase       (number)
//   maxDifficulty  (number)
//   surah          (number)
//   skillBucket    (string)
//   suitableType   (string)
//   letterIds      (comma-separated numbers, e.g. "2,12,24")
//   limit          (number, max 200, default 50)
//   orderBy        ("frequency" or "difficulty")
//
// Returns: { count: N, words: [...] }

router.get("/", (req, res) => {
  try {
    const filters = {};

    if (req.query.maxPhase !== undefined) {
      const val = Number(req.query.maxPhase);
      if (!Number.isFinite(val)) {
        return res.status(400).json({ error: "maxPhase must be a number" });
      }
      filters.maxPhase = val;
    }

    if (req.query.maxDifficulty !== undefined) {
      const val = Number(req.query.maxDifficulty);
      if (!Number.isFinite(val)) {
        return res.status(400).json({ error: "maxDifficulty must be a number" });
      }
      filters.maxDifficulty = val;
    }

    if (req.query.surah !== undefined) {
      const val = Number(req.query.surah);
      if (!Number.isFinite(val)) {
        return res.status(400).json({ error: "surah must be a number" });
      }
      filters.surah = val;
    }

    if (req.query.skillBucket !== undefined) {
      filters.skillBucket = String(req.query.skillBucket);
    }

    if (req.query.suitableType !== undefined) {
      filters.suitableType = String(req.query.suitableType);
    }

    if (req.query.letterIds !== undefined) {
      const parts = String(req.query.letterIds).split(",").map(s => s.trim()).filter(Boolean);
      const ids = parts.map(Number);
      if (ids.some(n => !Number.isFinite(n) || !Number.isInteger(n))) {
        return res.status(400).json({ error: "letterIds must be comma-separated integers" });
      }
      filters.containsLetterIds = ids;
    }

    // limit: max 200, default 50
    let limit = 50;
    if (req.query.limit !== undefined) {
      const val = Number(req.query.limit);
      if (!Number.isFinite(val) || val < 1) {
        return res.status(400).json({ error: "limit must be a positive number" });
      }
      limit = Math.min(Math.floor(val), 200);
    }
    filters.limit = limit;

    if (req.query.orderBy !== undefined) {
      const val = String(req.query.orderBy);
      if (val !== "frequency" && val !== "difficulty") {
        return res.status(400).json({ error: 'orderBy must be "frequency" or "difficulty"' });
      }
      filters.orderBy = val;
    }

    const db = getDb();
    const words = queryWords(db, filters);
    return res.json({ count: words.length, words });
  } catch (err) {
    console.error("[Words API] GET / error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/words/surah/:number ─────────────────────────────────────────────
// Get all words for a surah (1-114), ordered by ayah then word position.
//
// Returns: { surah: N, count: N, words: [...] }
// Returns 400 for invalid surah number.

router.get("/surah/:number", (req, res) => {
  try {
    const num = Number(req.params.number);
    if (!Number.isInteger(num) || num < 1 || num > 114) {
      return res.status(400).json({ error: "Surah number must be an integer between 1 and 114" });
    }

    const db = getDb();
    const words = getWordsBySurah(db, num);
    return res.json({ surah: num, count: words.length, words });
  } catch (err) {
    console.error("[Words API] GET /surah/:number error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/words/:id ───────────────────────────────────────────────────────
// Get a single word by database ID.
//
// Returns: the word object directly
// Returns 400 for non-numeric ID, 404 for not found.

router.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "ID must be a positive integer" });
    }

    const db = getDb();
    const word = getWordById(db, id);
    if (!word) {
      return res.status(404).json({ error: `Word with id ${id} not found` });
    }
    return res.json(word);
  } catch (err) {
    console.error("[Words API] GET /:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
