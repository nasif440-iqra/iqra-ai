CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  arabic_text TEXT NOT NULL,
  arabic_plain TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  english_meaning TEXT NOT NULL,
  root_word TEXT,
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  word_position INTEGER NOT NULL,
  quran_frequency INTEGER DEFAULT 1,
  min_phase INTEGER NOT NULL DEFAULT 4,
  prerequisite_letter_ids TEXT NOT NULL DEFAULT '[]',
  prerequisite_symbols TEXT NOT NULL DEFAULT '[]',
  difficulty_tier INTEGER NOT NULL DEFAULT 1,
  suitable_types TEXT NOT NULL DEFAULT '[]',
  skill_buckets TEXT NOT NULL DEFAULT '[]',
  letter_breakdown TEXT NOT NULL DEFAULT '[]',
  audio_word TEXT,
  audio_syllables TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(arabic_text, surah_number, ayah_number, word_position)
);

CREATE INDEX IF NOT EXISTS idx_words_surah ON words(surah_number, ayah_number);
CREATE INDEX IF NOT EXISTS idx_words_phase ON words(min_phase);
CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_tier);
CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(quran_frequency DESC);
CREATE INDEX IF NOT EXISTS idx_words_plain ON words(arabic_plain);

-- letter_breakdown JSON structure (per element):
-- {
--   "letter_id": 2,
--   "position": "isolated" | "initial" | "medial" | "final",
--   "diacritical": "fatha" | "kasra" | "damma" | "sukoon" | "shaddah" |
--                  "shaddah_fatha" | "shaddah_kasra" | "shaddah_damma" |
--                  "tanween_fatha" | "tanween_kasra" | "tanween_damma" | null,
--   "tajweed_rules": ["rule_name", ...]
-- }
