import { getLetter } from "../../data/letters.js";
import { getCombo, generateHarakatCombos } from "../../data/harakat.js";
import { shuffle, getDistractors, getRuleDistractors, makeOpts, makeNameOpts } from "./shared.js";
import { parseEntityKey } from "../mastery.js";

/**
 * Generate questions for review sessions (spaced repetition).
 * teachIds can be:
 *  - numeric letter IDs (legacy): [2, 3, 5]
 *  - entity key strings: ["letter:2", "combo:ba-fatha"]
 *
 * teachCombos (optional): string[] of combo IDs like ["ba-fatha", "ta-kasra"]
 *
 * For letter entities: recognition question types (same as Phase 1).
 * For combo entities: harakat-style questions (mark-to-sound matching).
 *
 * Weight toward entities with lower SRS sessionStreak.
 * Generate min(dueCount * 3, 15) questions.
 */
export function generateReviewQs(lesson, progress) {
  const rawIds = lesson.teachIds || [];

  // Normalize: accept both entity keys and legacy numeric IDs
  const letterIds = [];
  const comboIds = [];

  for (const id of rawIds) {
    if (typeof id === "number") {
      letterIds.push(id);
    } else if (typeof id === "string") {
      const parsed = parseEntityKey(id);
      if (parsed.type === "letter" && typeof parsed.rawId === "number") {
        letterIds.push(parsed.rawId);
      } else if (parsed.type === "combo") {
        comboIds.push(parsed.rawId);
      }
    }
  }

  // Also accept explicit teachCombos from the review payload
  if (lesson.teachCombos?.length > 0) {
    for (const cid of lesson.teachCombos) {
      if (!comboIds.includes(cid)) comboIds.push(cid);
    }
  }

  const dueLetterIds = [...new Set(letterIds)];
  const dueComboIds = [...new Set(comboIds)];
  const totalDue = dueLetterIds.length + dueComboIds.length;

  if (totalDue === 0) return [];

  const qs = [];

  // ── Letter review questions ──
  if (dueLetterIds.length > 0) {
    const totalLetterQs = Math.min(dueLetterIds.length * 3, 15);
    const allPool = [...dueLetterIds];

    // Weight toward letters with lower sessionStreak
    const weighted = [];
    for (const id of dueLetterIds) {
      const entry = progress?.[id];
      const streak = entry?.sessionStreak ?? 0;
      const weight = streak <= 0 ? 4 : streak <= 1 ? 3 : streak <= 2 ? 2 : 1;
      for (let i = 0; i < weight; i++) weighted.push(id);
    }

    // Build question targets: ensure each due letter appears at least once
    const guaranteed = shuffle([...dueLetterIds]).slice(0, Math.min(dueLetterIds.length, totalLetterQs));
    const remaining = totalLetterQs - guaranteed.length;
    const extra = [];
    for (let i = 0; i < remaining; i++) {
      const pool = weighted.length > 0 ? weighted : dueLetterIds;
      extra.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    const questionLetterIds = shuffle([...guaranteed, ...extra]);
    const qTypes = ["tap", "name_to_letter", "letter_to_name", "rule", "find"];

    for (let i = 0; i < Math.min(questionLetterIds.length, totalLetterQs); i++) {
      const lid = questionLetterIds[i];
      const t = getLetter(lid);
      if (!t) continue;

      const type = qTypes[i % qTypes.length];
      const dists = getDistractors(t.id, allPool, 2);

      if (type === "tap") {
        qs.push({ type: "tap", prompt: `Tap ${t.name}`, targetId: t.id, options: makeOpts([t, ...dists], t.id) });
      } else if (type === "name_to_letter") {
        qs.push({ type: "name_to_letter", prompt: `Which is ${t.name}?`, targetId: t.id, options: makeOpts([t, ...dists], t.id) });
      } else if (type === "letter_to_name") {
        qs.push({ type: "letter_to_name", prompt: t.letter, promptSubtext: "What is this letter?", targetId: t.id, options: makeNameOpts([t, ...dists], t.id) });
      } else if (type === "rule") {
        const rd = getRuleDistractors(t, allPool, 2);
        qs.push({ type: "rule", prompt: t.dots > 0 ? `Which has ${t.visualRule}?` : `Which has no dots?`, targetId: t.id, options: makeOpts([t, ...rd], t.id) });
      } else {
        qs.push({ type: "find", prompt: `Find ${t.name}`, targetId: t.id, options: makeOpts([t, ...dists], t.id) });
      }
    }
  }

  // ── Combo review questions (harakat) ──
  if (dueComboIds.length > 0) {
    const maxComboQs = Math.min(dueComboIds.length * 2, 10);
    let comboQCount = 0;

    for (const cid of shuffle([...dueComboIds])) {
      if (comboQCount >= maxComboQs) break;

      const combo = getCombo(cid);
      if (!combo) continue;

      // Get all combos for the same letter as distractors
      const sameLetter = generateHarakatCombos([combo.letterId]);
      if (sameLetter.length < 2) continue;

      // Q1: "Which one says X?" — identify correct combo among same-letter options
      qs.push({
        type: "tap",
        prompt: `Which one says \u201C${combo.sound}\u201D?`,
        targetId: combo.id,
        isHarakat: true,
        hasAudio: true,
        ttsText: combo.audioText,
        options: shuffle(sameLetter.map(c => ({
          id: c.id, label: c.display, isCorrect: c.id === combo.id,
        }))),
      });
      comboQCount++;

      if (comboQCount >= maxComboQs) break;

      // Q2: "What sound does this make?" — identify sound from display
      qs.push({
        type: "letter_to_name",
        prompt: combo.display,
        promptSubtext: "What sound does this make?",
        targetId: combo.id,
        isHarakat: true,
        ttsText: combo.audioText,
        options: shuffle(sameLetter.map(c => ({
          id: c.id, label: `\u201C${c.sound}\u201D`, isCorrect: c.id === combo.id,
        }))),
      });
      comboQCount++;
    }
  }

  // Cap total questions and shuffle
  const totalQs = Math.min(totalDue * 3, 15);
  return shuffle(qs).slice(0, totalQs);
}
