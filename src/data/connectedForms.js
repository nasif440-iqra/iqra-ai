// Connected form data for all 28 Arabic letters.
// Each entry provides the 4 positional Unicode forms and whether the letter
// connects forward (joins to the next letter in a word).
//
// 6 non-connectors (do not join forward): Alif(1), Daal(8), Dhaal(9), Ra(10), Zay(11), Waw(27)
// For non-connectors, initial and medial fields use the isolated form.
// Alif has a distinct final form (U+FE8E) but no true initial/medial variant.

export const CONNECTED_FORMS = {
  1:  { forms: { isolated: "\u0627", initial: "\u0627", medial: "\u0627", final: "\uFE8E" }, joins: false },  // Alif
  2:  { forms: { isolated: "\u0628", initial: "\uFE91", medial: "\uFE92", final: "\uFE90" }, joins: true  },  // Ba
  3:  { forms: { isolated: "\u062A", initial: "\uFE97", medial: "\uFE98", final: "\uFE96" }, joins: true  },  // Ta
  4:  { forms: { isolated: "\u062B", initial: "\uFE9B", medial: "\uFE9C", final: "\uFE9A" }, joins: true  },  // Tha
  5:  { forms: { isolated: "\u062C", initial: "\uFE9F", medial: "\uFEA0", final: "\uFE9E" }, joins: true  },  // Jeem
  6:  { forms: { isolated: "\u062D", initial: "\uFEA3", medial: "\uFEA4", final: "\uFEA2" }, joins: true  },  // Haa
  7:  { forms: { isolated: "\u062E", initial: "\uFEA7", medial: "\uFEA8", final: "\uFEA6" }, joins: true  },  // Khaa
  8:  { forms: { isolated: "\u062F", initial: "\u062F", medial: "\u062F", final: "\uFEAA" }, joins: false },  // Daal
  9:  { forms: { isolated: "\u0630", initial: "\u0630", medial: "\u0630", final: "\uFEAC" }, joins: false },  // Dhaal
  10: { forms: { isolated: "\u0631", initial: "\u0631", medial: "\u0631", final: "\uFEAE" }, joins: false },  // Ra
  11: { forms: { isolated: "\u0632", initial: "\u0632", medial: "\u0632", final: "\uFEB0" }, joins: false },  // Zay
  12: { forms: { isolated: "\u0633", initial: "\uFEB3", medial: "\uFEB4", final: "\uFEB2" }, joins: true  },  // Seen
  13: { forms: { isolated: "\u0634", initial: "\uFEB7", medial: "\uFEB8", final: "\uFEB6" }, joins: true  },  // Sheen
  14: { forms: { isolated: "\u0635", initial: "\uFEBB", medial: "\uFEBC", final: "\uFEBA" }, joins: true  },  // Saad
  15: { forms: { isolated: "\u0636", initial: "\uFEBF", medial: "\uFEC0", final: "\uFEBE" }, joins: true  },  // Daad
  16: { forms: { isolated: "\u0637", initial: "\uFEC3", medial: "\uFEC4", final: "\uFEC2" }, joins: true  },  // Taa
  17: { forms: { isolated: "\u0638", initial: "\uFEC7", medial: "\uFEC8", final: "\uFEC6" }, joins: true  },  // Dhaa
  18: { forms: { isolated: "\u0639", initial: "\uFECB", medial: "\uFECC", final: "\uFECA" }, joins: true  },  // Ain
  19: { forms: { isolated: "\u063A", initial: "\uFECF", medial: "\uFED0", final: "\uFECE" }, joins: true  },  // Ghain
  20: { forms: { isolated: "\u0641", initial: "\uFED3", medial: "\uFED4", final: "\uFED2" }, joins: true  },  // Fa
  21: { forms: { isolated: "\u0642", initial: "\uFED7", medial: "\uFED8", final: "\uFED6" }, joins: true  },  // Qaf
  22: { forms: { isolated: "\u0643", initial: "\uFEDB", medial: "\uFEDC", final: "\uFEDA" }, joins: true  },  // Kaf
  23: { forms: { isolated: "\u0644", initial: "\uFEDF", medial: "\uFEE0", final: "\uFEDE" }, joins: true  },  // Lam
  24: { forms: { isolated: "\u0645", initial: "\uFEE3", medial: "\uFEE4", final: "\uFEE2" }, joins: true  },  // Meem
  25: { forms: { isolated: "\u0646", initial: "\uFEE7", medial: "\uFEE8", final: "\uFEE6" }, joins: true  },  // Noon
  26: { forms: { isolated: "\u0647", initial: "\uFEEB", medial: "\uFEEC", final: "\uFEEA" }, joins: true  },  // Ha
  27: { forms: { isolated: "\u0648", initial: "\u0648", medial: "\u0648", final: "\uFEEE" }, joins: false },  // Waw
  28: { forms: { isolated: "\u064A", initial: "\uFEF3", medial: "\uFEF4", final: "\uFEF2" }, joins: true  },  // Ya
};

/**
 * Returns the connected form data for the given letter ID, or null if not found.
 * @param {number} letterId
 * @returns {{ forms: { isolated: string, initial: string, medial: string, final: string }, joins: boolean } | null}
 */
export function getConnectedForms(letterId) {
  return CONNECTED_FORMS[letterId] ?? null;
}

/**
 * Returns whether the letter with the given ID connects forward (joins to the next letter).
 * Returns false for unknown IDs.
 * @param {number} letterId
 * @returns {boolean}
 */
export function doesLetterJoin(letterId) {
  const entry = CONNECTED_FORMS[letterId];
  return entry ? entry.joins : false;
}

/**
 * Returns an array of letter IDs that are non-connectors (do not join to the next letter).
 * @returns {number[]}
 */
export function getBreakerIds() {
  return Object.entries(CONNECTED_FORMS)
    .filter(([, v]) => !v.joins)
    .map(([k]) => Number(k))
    .sort((a, b) => a - b);
}
