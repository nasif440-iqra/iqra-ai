import { getLetter } from "../../data/letters.js";
import { shuffle, pickRandom } from "./shared.js";

const VOWEL_MARKS = {
  fatha: "\u064E",
  kasra: "\u0650",
  damma: "\u064F",
};

const VOWEL_SOUNDS = {
  fatha: "a",
  kasra: "i",
  damma: "u",
};

const VOWEL_NAMES = {
  fatha: "Fatha",
  kasra: "Kasra",
  damma: "Damma",
};

function getTranslitBase(letter) {
  let base = letter.transliteration;
  if (base === "'a") return "'";
  return base;
}

function buildBuildupPair(letterId1, letterId2, vowelId) {
  const l1 = getLetter(letterId1);
  const l2 = getLetter(letterId2);
  if (!l1 || !l2) return null;

  const mark = VOWEL_MARKS[vowelId];
  const vowelSound = VOWEL_SOUNDS[vowelId];
  const base1 = getTranslitBase(l1);
  const base2 = getTranslitBase(l2);

  const arabic1 = l1.letter + mark;
  const arabic2 = l2.letter + mark;
  const sound1 = base1 + vowelSound;
  const sound2 = base2 + vowelSound;
  const combined = arabic1 + arabic2;
  const combinedTranslit = sound1 + "-" + sound2;

  return {
    type: "buildup_pair",
    segments: [
      { arabic: arabic1, sound: sound1, letterId: letterId1 },
      { arabic: arabic2, sound: sound2, letterId: letterId2 },
    ],
    fullWord: {
      arabic: combined,
      transliteration: combinedTranslit,
      ttsText: combined,
    },
    explanation: `Read right to left: ${l1.name} (${l1.letter}) with ${VOWEL_NAMES[vowelId]} connects to ${l2.name} (${l2.letter}) with ${VOWEL_NAMES[vowelId]}.`,
  };
}

function buildFreeRead(buildupExercise) {
  return {
    type: "free_read",
    arabic: buildupExercise.fullWord.arabic,
    transliteration: buildupExercise.fullWord.transliteration,
    ttsText: buildupExercise.fullWord.ttsText,
    prompt: "Read this aloud",
  };
}

function buildComprehension(buildupExercise, allBuildup) {
  const correct = buildupExercise.fullWord.transliteration;
  const distractors = allBuildup
    .filter(e => e.fullWord.transliteration !== correct)
    .map(e => e.fullWord.transliteration);
  const uniqueDistractors = [...new Set(distractors)].slice(0, 2);

  // Pad with simple fallbacks if not enough distractors
  while (uniqueDistractors.length < 2) {
    const fallback = "ba-" + Object.values(VOWEL_SOUNDS)[uniqueDistractors.length];
    if (fallback !== correct && !uniqueDistractors.includes(fallback)) {
      uniqueDistractors.push(fallback);
    } else {
      uniqueDistractors.push("ka-ma");
    }
  }

  const options = shuffle([
    { id: "correct", label: correct, isCorrect: true },
    ...uniqueDistractors.map((t, i) => ({ id: `distractor_${i}`, label: t, isCorrect: false })),
  ]);

  return {
    type: "comprehension",
    prompt: "What did you just read?",
    displayArabic: buildupExercise.fullWord.arabic,
    targetId: "correct",
    options,
  };
}

/**
 * Generate exercises for Phase 5 connected reading lessons.
 * @param {{ id: number, phase: number, lessonMode: string, lessonType: string, module: string, teachIds: number[], reviewIds: number[] }} lesson
 * @returns {Array}
 */
export function generateConnectedReadingExercises(lesson) {
  if (!lesson) return [];
  const teachIds = lesson.teachIds || [];
  if (teachIds.length < 2) return [];

  const allBuildup = [];

  // Generate buildup pairs for each adjacent pair and each vowel
  for (let i = 0; i < teachIds.length - 1; i++) {
    for (const vowelId of Object.keys(VOWEL_MARKS)) {
      const ex = buildBuildupPair(teachIds[i], teachIds[i + 1], vowelId);
      if (ex) allBuildup.push(ex);
    }
  }

  // Shuffle and limit to 4 buildup exercises
  const selectedBuildup = shuffle(allBuildup).slice(0, 4);

  // Generate 2 free_read exercises from the buildup words
  const freeReadSource = shuffle([...selectedBuildup]).slice(0, 2);
  const freeReads = freeReadSource.map(buildFreeRead);

  // Generate 1 comprehension exercise from any buildup word
  const compSource = pickRandom(selectedBuildup);
  const comprehension = buildComprehension(compSource, allBuildup);

  return [...selectedBuildup, ...freeReads, comprehension];
}
