import { getLetter, ARABIC_LETTERS } from "../../data/letters.js";
import { getConnectedForms, doesLetterJoin, getBreakerIds } from "../../data/connectedForms.js";
import { shuffle, pickRandom } from "./shared.js";

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
      label: l ? l.name : String(lid),
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

function buildFamilyContrastExercises(teachIds) {
  if (teachIds.length < 2) return [];
  const exercises = [];
  // Pick positions to cycle through — one per exercise
  const positionCycle = ["initial", "medial", "final"];
  const count = Math.min(3, teachIds.length);
  const letterPool = shuffle([...teachIds]);
  for (let i = 0; i < count; i++) {
    const letterId = letterPool[i % letterPool.length];
    const cf = getConnectedForms(letterId);
    if (!cf) continue;
    const positions = getAvailablePositions(letterId);
    const targetPos = positionCycle[i % positionCycle.length];
    // Fall back if this letter doesn't have that position
    const pos = positions.includes(targetPos) ? targetPos : pickRandom(positions);
    const displayForm = cf.forms[pos];
    const options = shuffle(teachIds.map(id => {
      const l = getLetter(id);
      return {
        id,
        label: l ? l.name : String(id),
        isCorrect: id === letterId,
      };
    }));
    exercises.push({
      type: "comprehension",
      prompt: "Which letter is this in its connected form?",
      displayArabic: displayForm,
      targetId: letterId,
      options,
    });
  }
  return exercises;
}

function buildReverseIdentification(letterId) {
  const letter = getLetter(letterId);
  const cf = getConnectedForms(letterId);
  if (!letter || !cf) return null;
  const positions = getAvailablePositions(letterId);
  const targetPos = pickRandom(positions.filter(p => p !== "isolated"));
  const posLabel = { initial: "START", medial: "MIDDLE", final: "END" }[targetPos] || "ISOLATED";
  // Build options: show forms from different positions (including the correct one)
  const optionPositions = shuffle(positions).slice(0, Math.min(4, positions.length));
  if (!optionPositions.includes(targetPos)) {
    optionPositions[0] = targetPos;
  }
  const positionLabels = {
    isolated: "Isolated",
    initial: "Initial",
    medial: "Medial",
    final: "Final",
  };
  const options = shuffle(optionPositions.map(pos => ({
    id: pos,
    label: cf.forms[pos],
    isCorrect: pos === targetPos,
    sublabel: positionLabels[pos],
  })));
  return {
    type: "comprehension",
    prompt: `Show me the ${posLabel} form of ${letter.name}`,
    targetId: targetPos,
    letterId,
    options,
  };
}

function buildFreeIdentification(letterId, teachIds) {
  const letter = getLetter(letterId);
  const cf = getConnectedForms(letterId);
  if (!letter || !cf) return null;
  const positions = getAvailablePositions(letterId);
  const pos = pickRandom(positions);
  const displayForm = cf.forms[pos];
  // Get distractors from OTHER families
  const allOtherIds = Array.from({ length: 28 }, (_, i) => i + 1)
    .filter(id => id !== letterId && !teachIds.includes(id));
  const distractors = shuffle(allOtherIds).slice(0, 2);
  const options = shuffle([
    { id: letterId, label: letter.name, isCorrect: true },
    ...distractors.map(id => {
      const l = getLetter(id);
      return { id, label: l ? l.name : String(id), isCorrect: false };
    }),
  ]);
  return {
    type: "comprehension",
    prompt: "Which letter is this?",
    displayArabic: displayForm,
    targetId: letterId,
    options,
  };
}

function buildSoundReviewQuestion(letterId) {
  const letter = getLetter(letterId);
  if (!letter) return null;
  const allLetters = ARABIC_LETTERS.filter(l => l.id !== letterId);
  const distractors = shuffle(allLetters).slice(0, 2);
  return {
    type: "comprehension",
    prompt: `Review: What sound does ${letter.name} make?`,
    displayArabic: letter.letter,
    targetId: letterId,
    options: shuffle([
      { id: letterId, label: letter.soundHint, isCorrect: true },
      ...distractors.map(d => ({ id: d.id, label: d.soundHint, isCorrect: false })),
    ]),
  };
}

function buildHarakatReviewQuestion(letterId) {
  const letter = getLetter(letterId);
  if (!letter) return null;
  const vowels = [
    { mark: "\u064E", sound: "a", name: "fatha" },
    { mark: "\u0650", sound: "i", name: "kasra" },
    { mark: "\u064F", sound: "u", name: "damma" },
  ];
  const target = pickRandom(vowels);
  const display = letter.letter + target.mark;
  const correctSound = letter.transliteration + target.sound;
  const wrongVowels = vowels.filter(v => v.name !== target.name);
  return {
    type: "comprehension",
    prompt: "Review: What sound does this make?",
    displayArabic: display,
    targetId: letterId,
    options: shuffle([
      { id: target.name, label: `"${correctSound}"`, isCorrect: true },
      ...wrongVowels.map(v => ({ id: v.name, label: `"${letter.transliteration + v.sound}"`, isCorrect: false })),
    ]),
  };
}

// Modules that should NOT receive review questions
const NO_REVIEW_MODULES = new Set(["4.0", "4.18", "4.20"]);

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
      { id: letterId, label: letter.name, isCorrect: true },
      ...pool.map(id => {
        const l = getLetter(id);
        return { id, label: l ? l.name : String(id), isCorrect: false };
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
      { id: letterId, label: letter.name, isCorrect: true },
      ...pool.map(id => {
        const l = getLetter(id);
        return { id, label: l ? l.name : String(id), isCorrect: false };
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
  if (!lesson) return [];
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
  const isFamily = teachIds.length >= 2;

  if (isFamily) {
    // ── Family lessons (2-3 teachIds): min 10 exercises ──

    // 1. Guided reveal per letter (2-3)
    for (const letterId of teachIds) {
      const reveal = buildGuidedReveal(letterId);
      if (reveal) exercises.push(reveal);
    }

    // 2. Family contrast exercises (3)
    const contrasts = buildFamilyContrastExercises(teachIds);
    exercises.push(...contrasts);

    // 3. Position identification × 2
    const posLetters = shuffle([...teachIds]);
    for (let i = 0; i < 2; i++) {
      const posComp = buildPositionComprehension(posLetters[i % posLetters.length]);
      if (posComp) exercises.push(posComp);
    }

    // 4. Mixed identification × 2: show form from any family member, options include family + one outsider
    for (let i = 0; i < 2; i++) {
      const srcId = pickRandom(teachIds);
      const cf = getConnectedForms(srcId);
      const letter = getLetter(srcId);
      if (!cf || !letter) continue;
      const positions = getAvailablePositions(srcId);
      const pos = pickRandom(positions);
      const outsiderPool = Array.from({ length: 28 }, (_, j) => j + 1)
        .filter(id => !teachIds.includes(id));
      const outsider = getLetter(pickRandom(outsiderPool));
      const options = shuffle([
        ...teachIds.map(id => {
          const l = getLetter(id);
          return { id, label: l ? l.name : String(id), isCorrect: id === srcId };
        }),
        ...(outsider ? [{ id: outsider.id, label: outsider.name, isCorrect: false }] : []),
      ]);
      exercises.push({
        type: "comprehension",
        prompt: "Which letter is this connected form?",
        displayArabic: cf.forms[pos],
        targetId: srcId,
        options,
      });
    }
  } else {
    // ── Single-letter lessons (1 teachId): min 8 exercises ──
    const letterId = teachIds[0];

    // 1. Guided reveal (1)
    const reveal = buildGuidedReveal(letterId);
    if (reveal) exercises.push(reveal);

    // 2. Position identification × 2
    for (let i = 0; i < 2; i++) {
      const posComp = buildPositionComprehension(letterId);
      if (posComp) exercises.push(posComp);
    }

    // 3. Reverse identification × 2
    for (let i = 0; i < 2; i++) {
      const rev = buildReverseIdentification(letterId);
      if (rev) exercises.push(rev);
    }

    // 4. Context word exercise — 1 (family comprehension style, using letter itself)
    const cf = getConnectedForms(letterId);
    const letter = getLetter(letterId);
    if (cf && letter) {
      const positions = getAvailablePositions(letterId);
      const pos = pickRandom(positions);
      const outsiders = shuffle(
        Array.from({ length: 28 }, (_, i) => i + 1).filter(id => id !== letterId)
      ).slice(0, 2);
      exercises.push({
        type: "comprehension",
        prompt: "Which letter is this?",
        displayArabic: cf.forms[pos],
        targetId: letterId,
        options: shuffle([
          { id: letterId, label: letter.name, isCorrect: true },
          ...outsiders.map(id => {
            const l = getLetter(id);
            return { id, label: l ? l.name : String(id), isCorrect: false };
          }),
        ]),
      });
    }

    // 5. Free identification × 2
    for (let i = 0; i < 2; i++) {
      const free = buildFreeIdentification(letterId, teachIds);
      if (free) exercises.push(free);
    }
  }

  // ── Add review questions for modules 4.1–4.17 and 4.19 ──
  if (!NO_REVIEW_MODULES.has(lesson.module)) {
    const reviewQs = [];
    for (const letterId of shuffle([...teachIds]).slice(0, 2)) {
      const soundQ = buildSoundReviewQuestion(letterId);
      if (soundQ) reviewQs.push(soundQ);
      if (reviewQs.length < 3) {
        const harakatQ = buildHarakatReviewQuestion(letterId);
        if (harakatQ) reviewQs.push(harakatQ);
      }
    }
    // Insert review questions at random positions in the exercise list
    for (const rq of reviewQs) {
      const insertAt = Math.floor(Math.random() * (exercises.length + 1));
      exercises.splice(insertAt, 0, rq);
    }
  }

  // Keep guided reveals at the start, shuffle the rest to avoid repetitive clustering
  const guided = exercises.filter(e => e.type === "guided_reveal");
  const rest = exercises.filter(e => e.type !== "guided_reveal");
  return [...guided, ...shuffle(rest)];
}
