// Phase 3: Harakat (short vowels) data
import { getLetter } from "./letters.js";

export const HARAKAT = [
  { id: "fatha", mark: "\u064E", name: "Fatha", sound: "a", description: 'short "a" sound', position: "above" },
  { id: "kasra", mark: "\u0650", name: "Kasra", sound: "i", description: 'short "i" sound', position: "below" },
  { id: "damma", mark: "\u064F", name: "Damma", sound: "u", description: 'short "u" sound', position: "above" },
];

// Original Ba/Ta/Tha combos — kept for backward compatibility with lessons 35-39
export const HARAKAT_COMBOS = [
  { id: "ba-fatha",  letterId: 2, harakahId: "fatha", display: "\u0628\u064E", audioText: "\u0628\u064E", sound: "ba", letterName: "Ba" },
  { id: "ba-kasra",  letterId: 2, harakahId: "kasra", display: "\u0628\u0650", audioText: "\u0628\u0650", sound: "bi", letterName: "Ba" },
  { id: "ba-damma",  letterId: 2, harakahId: "damma", display: "\u0628\u064F", audioText: "\u0628\u064F", sound: "bu", letterName: "Ba" },
  { id: "ta-fatha",  letterId: 3, harakahId: "fatha", display: "\u062A\u064E", audioText: "\u062A\u064E", sound: "ta", letterName: "Ta" },
  { id: "ta-kasra",  letterId: 3, harakahId: "kasra", display: "\u062A\u0650", audioText: "\u062A\u0650", sound: "ti", letterName: "Ta" },
  { id: "ta-damma",  letterId: 3, harakahId: "damma", display: "\u062A\u064F", audioText: "\u062A\u064F", sound: "tu", letterName: "Ta" },
  { id: "tha-fatha", letterId: 4, harakahId: "fatha", display: "\u062B\u064E", audioText: "\u062B\u064E", sound: "tha", letterName: "Tha" },
  { id: "tha-kasra", letterId: 4, harakahId: "kasra", display: "\u062B\u0650", audioText: "\u062B\u0650", sound: "thi", letterName: "Tha" },
  { id: "tha-damma", letterId: 4, harakahId: "damma", display: "\u062B\u064F", audioText: "\u062B\u064F", sound: "thu", letterName: "Tha" },
];

// UI label derived from transliteration — display hint only, never drives pronunciation.
// Actual pronunciation is determined by audioText (Arabic text) sent to TTS.
function getComboLabel(letter, harakat) {
  if (letter.id === 1) return harakat.sound; // Alif: just "a"/"i"/"u"
  let base = letter.transliteration;
  if (base === "'a") base = "'"; // Ain: strip inherent vowel
  return base + harakat.sound;
}

// Alif with short vowels needs Hamza-bearing forms for TTS to pronounce correctly.
// Bare Alif + damma/kasra is orthographically unusual and TTS may produce silence.
const ALIF_AUDIO_TEXT = {
  fatha: "\u0623\u064E", // أَ — Alif with Hamza above + Fatha
  kasra: "\u0625\u0650", // إِ — Alif with Hamza below + Kasra
  damma: "\u0623\u064F", // أُ — Alif with Hamza above + Damma
};

// Dynamically generate harakat combos for any set of letter IDs
export function generateHarakatCombos(letterIds, harakatIds) {
  const marks = harakatIds
    ? HARAKAT.filter(h => harakatIds.includes(h.id))
    : HARAKAT;
  const combos = [];
  for (const lid of letterIds) {
    const letter = getLetter(lid);
    if (!letter) continue;
    for (const h of marks) {
      const id = `${letter.name.toLowerCase()}-${h.id}`;
      // Reuse existing static combo if available
      const existing = HARAKAT_COMBOS.find(c => c.id === id);
      if (existing) {
        combos.push(existing);
      } else {
        const display = letter.letter + h.mark;
        // Use Hamza-bearing Alif for TTS audio (bare Alif + vowel marks don't pronounce reliably)
        const audioText = (lid === 1 && ALIF_AUDIO_TEXT[h.id]) ? ALIF_AUDIO_TEXT[h.id] : display;
        combos.push({
          id,
          letterId: lid,
          harakahId: h.id,
          display,
          audioText,
          sound: getComboLabel(letter, h),
          letterName: letter.name,
        });
      }
    }
  }
  return combos;
}

export function getHarakah(id) {
  return HARAKAT.find(h => h.id === id);
}

export function getCombo(id) {
  return HARAKAT_COMBOS.find(c => c.id === id);
}
