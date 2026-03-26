/**
 * Seed script — inserts word records from JSON files into the Tila word bank.
 *
 * Usage:
 *   node server/seed-words.js                    # seeds all JSON files in data/seed/
 *   node server/seed-words.js words-al-ikhlas    # seeds only data/seed/words-al-ikhlas.json
 *
 * Behavior:
 *   - Wraps all inserts in a single transaction for speed.
 *   - Skips rows that violate the UNIQUE(arabic_text, surah_number, ayah_number, word_position)
 *     constraint (idempotent — safe to run multiple times).
 *   - Prints a summary: N inserted, N skipped.
 *   - Prints total word count in the database at the end.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, closeDb } from "./db.js";
import { insertWord } from "./words-query.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SEED_DIR = path.join(PROJECT_ROOT, "data", "seed");

// ── Resolve which files to seed ────────────────────────────────────────────

const [, , targetArg] = process.argv;

let filesToSeed;

if (targetArg) {
  // Specific file requested — resolve to full path
  const filename = targetArg.endsWith(".json") ? targetArg : `${targetArg}.json`;
  const filePath = path.join(SEED_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: seed file not found: ${filePath}`);
    process.exit(1);
  }
  filesToSeed = [filePath];
} else {
  // No argument — seed all .json files in data/seed/
  if (!fs.existsSync(SEED_DIR)) {
    console.error(`Error: seed directory not found: ${SEED_DIR}`);
    process.exit(1);
  }
  filesToSeed = fs
    .readdirSync(SEED_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(SEED_DIR, f));

  if (filesToSeed.length === 0) {
    console.log("No seed files found in", SEED_DIR);
    closeDb();
    process.exit(0);
  }
}

// ── Seed ────────────────────────────────────────────────────────────────────

const db = getDb();

let totalInserted = 0;
let totalSkipped = 0;

for (const filePath of filesToSeed) {
  const filename = path.basename(filePath);
  console.log(`\nSeeding: ${filename}`);

  let words;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    words = JSON.parse(raw);
  } catch (err) {
    console.error(`  Failed to read/parse ${filename}:`, err.message);
    continue;
  }

  if (!Array.isArray(words)) {
    console.error(`  Skipping ${filename}: expected a JSON array at root`);
    continue;
  }

  let fileInserted = 0;
  let fileSkipped = 0;

  // Wrap in a transaction for speed
  const seedFile = db.transaction(() => {
    for (const word of words) {
      // Supply optional audio fields as null if absent
      const wordWithDefaults = {
        audio_word: null,
        audio_syllables: null,
        ...word,
      };
      try {
        insertWord(db, wordWithDefaults);
        fileInserted++;
      } catch (err) {
        // SQLITE_CONSTRAINT = duplicate — skip gracefully
        if (err.code === "SQLITE_CONSTRAINT_UNIQUE" || err.code === "SQLITE_CONSTRAINT") {
          fileSkipped++;
        } else {
          // Unexpected error — re-throw so the transaction rolls back
          throw err;
        }
      }
    }
  });

  try {
    seedFile();
    console.log(`  Inserted: ${fileInserted}  Skipped: ${fileSkipped}`);
    totalInserted += fileInserted;
    totalSkipped += fileSkipped;
  } catch (err) {
    console.error(`  Transaction failed for ${filename}:`, err.message);
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Summary ──────────────────────────────`);
console.log(`  Total inserted : ${totalInserted}`);
console.log(`  Total skipped  : ${totalSkipped}`);

const { total } = db.prepare("SELECT COUNT(*) AS total FROM words").get();
console.log(`  Words in DB    : ${total}`);
console.log(`─────────────────────────────────────────\n`);

closeDb();
