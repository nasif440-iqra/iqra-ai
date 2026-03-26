/**
 * SQLite database module for Tila word bank.
 * Uses better-sqlite3 (synchronous API).
 *
 * Exports:
 *   getDb()     — lazy singleton connection
 *   closeDb()   — close the connection (useful in tests)
 *   getDbPath() — resolved path to the database file
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Resolve database path — allow override via environment variable
const DB_PATH =
  process.env.TILA_DB_PATH || path.join(PROJECT_ROOT, "data", "tila.db");

// Path to the schema SQL file (sibling of this module)
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

/** @type {import('better-sqlite3').Database | null} */
let db = null;

/**
 * Returns the resolved path to the SQLite database file.
 * @returns {string}
 */
export function getDbPath() {
  return DB_PATH;
}

/**
 * Lazy singleton — creates the database connection on first call,
 * applies schema, and configures pragmas. Returns the same instance
 * on subsequent calls.
 * @returns {import('better-sqlite3').Database}
 */
export function getDb() {
  if (db) return db;

  // Ensure the data/ directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Performance and correctness pragmas
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Apply schema (CREATE IF NOT EXISTS — idempotent)
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  return db;
}

/**
 * Closes the database connection and clears the singleton.
 * Safe to call even if the database was never opened.
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
