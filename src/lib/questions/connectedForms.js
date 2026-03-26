import { getLetter } from "../../data/letters.js";
import { getConnectedForms, doesLetterJoin, getBreakerIds } from "../../data/connectedForms.js";
import { shuffle, pickRandom } from "./shared.js";
import { getAnyContextWord } from "../../data/phase4Words.js";

const POSITIONS = ["isolated", "initial", "medial", "final"];

function getAvailablePositions(letterId) {
  return doesLetterJoin(letterId)
    ? POSITIONS
    : ["isolated", "final"];
}

function buildGuidedReveal(letterId) {
  const letter = getLetter(letterId);
  const cf = getConnectedForms(letterId);
  if (!letter || !cf) return null;
  const joins = doesLetterJoin(letterId);
  const explanation = joins
    ? `${letter.name} connects on both sides. Watch how it changes in each position.`
    : `${letter.name} only connects on the right — it never joins the letter that follows it.`;
  return {
    type: "guided_reveal",
    letterId,
    revealUpTo: "final",
    explanation,
    contextWord: getAnyContextWord(letterId) || undefined,
  };
}

function buildPositionComprehension(letterId) {
  const letter = getLetter(letterId);
  const cf = getConnectedForms(letterId);
  if (!letter || !cf) return null;
  const positions = getAvailablePositions(letterId);
  const targetPos = pickRandom(positions);
  const displayForm = cf.forms[targetPos];
  const positionLabels = {
    isolated: "Isolated (standalone)",
    initial: "Initial (start of word)",
    medial: "Medial (middle of word)",
    final: "Final (end of word)",
  };
  const options = positions.map(pos => ({
    id: pos,
    label: positionLabels[pos],
    isCorrect: pos === targetPos,
  }));
  return {
    type: "comprehension",
    prompt: `Which position is this form of ${letter.name}?`,
    displayArabic: displayForm,
    targetId: targetPos,
    letterId,
    options: shuffle(options),
  };
}

function buildFamilyComprehension(teachIds) {
  const sourceLetterId = pickRandom(teachIds);
  const cf = getConnectedForms(sourceLetterId);
  if (!cf) return null;
  const positions = getAvailablePositions(sourceLetterId);
  const pos = pickRandom(positions);
  const displayForm = cf.forms[pos];
  const options = teachIds.map(lid => {
    const l = getLetter(lid);
    return {
      id: lid,
      label: l ? `${l.name} (${l.letter})` : String(lid),
      isCorrect: lid === sourceLetterId,
    };
  });
  const sourceLetter = getLetter(sourceLetterId);
  return {
    type: "comprehension",
    prompt: "Which letter is this?",
    displayArabic: displayForm,
    targetId: sourceLetterId,
    options: shuffle(options),
    promptSubtext: sourceLetter ? `Shown in one of its connected forms` : undefined,
  };
}

function generateRTLExercises() {
  return [
    {
      type: "tap_in_order",
      letters: [
        { id: 22, arabic: "\u0643\u064E", sound: "ka" },
        { id: 3,  arabic: "\u062A\u064E", sound: "ta" },
        { id: 2,  arabic: "\u0628\u064E", sound: "ba" },
      ],
    },
    {
      type: "tap_in_order",
      letters: [
        { id: 12, arabic: "\u0633\u064E", sound: "sa" },
        { id: 23, arabic: "\u0644\u064E", sound: "la" },
        { id: 24, arabic: "\u0645\u064E", sound: "ma" },
      ],
    },
    {
      type: "comprehension",
      prompt: "Which direction does Arabic read?",
      targetId: "rtl",
      options: [
        { id: "rtl", label: "Right to left \u2190", isCorrect: true },
        { id: "ltr", label: "Left to right \u2192", isCorrect: false },
      ],
    },
  ];
}

function generateSpotTheBreakExercises(lesson) {
  const breakerIds = getBreakerIds();
  const connectorIds = Object.keys(
    Object.fromEntries(
      Array.from({ length: 28 }, (_, i) => i + 1)
        .filter(id => doesLetterJoin(id))
        .map(id => [id, true])
    )
  ).map(Number);

  const exercises = [];
  const breakersToUse = shuffle(breakerIds).slice(0, 3);
  for (const breakerId of breakersToUse) {
    const breakerLetter = getLetter(breakerId);
    const connector = getLetter(pickRandom(connectorIds));
    if (!breakerLetter || !connector) continue;
    const breakerCf = getConnectedForms(breakerId);
    const connectorCf = getConnectedForms(connector.id);
    if (!breakerCf || !connectorCf) continue;
    // Build a two-segment "word" where the breaker causes the chain to stop
    const wordArabic = connector.letter + "\u064E" + breakerLetter.letter + "\u064E";
    const wordTranslit = connector.transliteration + "a" + breakerLetter.transliteration + "a";
    exercises.push({
      type: "spot_the_break",
      word: { arabic: wordArabic, transliteration: wordTranslit },
      segments: [
        { arabic: connector.letter + "\u064E", letterIds: [connector.id], isBreakAfter: false },
        { arabic: breakerLetter.letter + "\u064E", letterIds: [breakerId], isBreakAfter: true },
      ],
      breakerLetterId: breakerId,
      explanation: `${breakerLetter.name} doesn\u2019t connect forward \u2014 it breaks the chain.`,
    });
  }
  return exercises;
}

function generateMixedRetrievalExercises(lesson) {
  const teachIds = lesson.teachIds || [];
  return teachIds.map(letterId => {
    const cf = getConnectedForms(letterId);
    const letter = getLetter(letterId);
    if (!cf || !letter) return null;
    const positions = getAvailablePositions(letterId);
    const pos = pickRandom(positions);
    const displayForm = cf.forms[pos];
    const pool = shuffle(
      Array.from({ length: 28 }, (_, i) => i + 1).filter(id => id !== letterId)
    ).slice(0, 2);
    const options = shuffle([
      { id: letterId, label: `${letter.name} (${letter.letter})`, isCorrect: true },
      ...pool.map(id => {
        const l = getLetter(id);
        return { id, label: l ? `${l.name} (${l.letter})` : String(id), isCorrect: false };
      }),
    ]);
    return {
      type: "comprehension",
      prompt: "Which letter is this connected form?",
      displayArabic: displayForm,
      targetId: letterId,
      options,
    };
  }).filter(Boolean);
}

function generateMasteryCheckExercises() {
  const allIds = Array.from({ length: 28 }, (_, i) => i + 1);
  const sampled = shuffle(allIds).slice(0, 12);
  return sampled.map(letterId => {
    const cf = getConnectedForms(letterId);
    const letter = getLetter(letterId);
    if (!cf || !letter) return null;
    const positions = getAvailablePositions(letterId);
    const pos = pickRandom(positions);
    const displayForm = cf.forms[pos];
    const pool = shuffle(allIds.filter(id => id !== letterId)).slice(0, 2);
    const options = shuffle([
      { id: letterId, label: `${letter.name} (${letter.letter})`, isCorrect: true },
      ...pool.map(id => {
        const l = getLetter(id);
        return { id, label: l ? `${l.name} (${l.letter})` : String(id), isCorrect: false };
      }),
    ]);
    return {
      type: "comprehension",
      prompt: "Identify this letter in its connected form",
      displayArabic: displayForm,
      targetId: letterId,
      options,
    };
  }).filter(Boolean);
}

/**
 * Generate exercises for Phase 4 connected forms lessons.
 * @param {{ id: number, phase: number, lessonMode: string, lessonType: string, module: string, teachIds: number[], reviewIds: number[], familyRule: string }} lesson
 * @returns {Array}
 */
export function generateConnectedFormExercises(lesson) {
  if (lesson.module === "4.0") {
    return generateRTLExercises();
  }

  if (lesson.module === "4.18") {
    return generateSpotTheBreakExercises(lesson);
  }

  if (lesson.module === "4.19") {
    return generateMixedRetrievalExercises(lesson);
  }

  if (lesson.module === "4.20") {
    return generateMasteryCheckExercises();
  }

  // Standard connected forms lesson
  const teachIds = lesson.teachIds || [];
  const exercises = [];

  for (const letterId of teachIds) {
    const reveal = buildGuidedReveal(letterId);
    if (reveal) exercises.push(reveal);

    const posComp = buildPositionComprehension(letterId);
    if (posComp) exercises.push(posComp);
  }

  if (teachIds.length >= 2) {
    const familyComp = buildFamilyComprehension(teachIds);
    if (familyComp) exercises.push(familyComp);
  }

  return exercises;
}
