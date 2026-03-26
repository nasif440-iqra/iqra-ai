import { getHarakah, getCombo, generateHarakatCombos } from "../../data/harakat.js";
import { shuffle, pickRandom } from "./shared.js";

function resolveHarakatCombos(lesson) {
  if (lesson.teachCombos?.length > 0) {
    return lesson.teachCombos.map(id => getCombo(id)).filter(Boolean);
  }
  return generateHarakatCombos(lesson.teachIds || [], lesson.teachHarakat);
}

function getHarakatDifficulty(lesson) {
  const heavyIds = [14, 15, 16, 17];
  const throatIds = [5, 6, 7, 18, 19];
  const teachIds = lesson.teachIds || [];
  const isHeavy = teachIds.some(id => heavyIds.includes(id));
  const isThroat = teachIds.some(id => throatIds.includes(id));
  const isMastery = lesson.id >= 82;
  const isEarlyHarakat = lesson.id <= 73;
  return { isHeavy, isThroat, isMastery, isEarlyHarakat };
}

export function generateHarakatIntroQs(lesson) {
  const harakat = (lesson.teachHarakat || []).map(id => getHarakah(id)).filter(Boolean);
  const qs = [];

  for (const h of harakat) {
    qs.push({ type: "tap", prompt: `Which one is ${h.name}?`, targetId: h.id, isHarakat: true, options: shuffle(harakat.map(hk => ({ id: hk.id, label: "\u25CC" + hk.mark, isCorrect: hk.id === h.id }))) });
  }

  for (const h of harakat) {
    qs.push({ type: "tap", prompt: `Which mark makes the \u201C${h.sound}\u201D sound?`, targetId: h.id, isHarakat: true, options: shuffle(harakat.map(hk => ({ id: hk.id, label: "\u25CC" + hk.mark, isCorrect: hk.id === h.id }))) });
  }

  for (const h of shuffle([...harakat]).slice(0, 2)) {
    qs.push({ type: "letter_to_name", prompt: "\u25CC" + h.mark, promptSubtext: "What does this mark do?", targetId: h.id, isHarakat: true, options: shuffle(harakat.map(hk => ({ id: hk.id, label: hk.description, isCorrect: hk.id === h.id }))) });
  }

  return qs;
}

export function generateHarakatQs(lesson) {
  const combos = resolveHarakatCombos(lesson);
  const isMixed = lesson.lessonMode === "harakat-mixed";
  const qs = [];

  if (isMixed) {
    const diff = getHarakatDifficulty(lesson);
    const byLetter = {};
    for (const c of combos) {
      if (!byLetter[c.letterId]) byLetter[c.letterId] = [];
      byLetter[c.letterId].push(c);
    }
    const letterGroups = Object.values(byLetter);

    // Phase A
    const phaseA = [];
    if ((diff.isHeavy || diff.isThroat) && letterGroups.length <= 2) {
      const firstGroup = letterGroups[0];
      const warmupTarget = firstGroup.find(c => c.harakahId === "fatha") || firstGroup[0];
      const warmupOpts = firstGroup.filter(c => c.harakahId === "fatha" || c.harakahId === "kasra");
      phaseA.push({ type: "tap", prompt: `Which one says \u201C${warmupTarget.sound}\u201D?`, targetId: warmupTarget.id, isHarakat: true, hasAudio: true, ttsText: warmupTarget.audioText, options: shuffle(warmupOpts.map(c => ({ id: c.id, label: c.display, isCorrect: c.id === warmupTarget.id }))) });
      const fullGroup = letterGroups.length > 1 ? letterGroups[1] : firstGroup;
      const fullTarget = pickRandom(fullGroup);
      phaseA.push({ type: "tap", prompt: `Which one says \u201C${fullTarget.sound}\u201D?`, targetId: fullTarget.id, isHarakat: true, hasAudio: true, ttsText: fullTarget.audioText, options: shuffle(fullGroup.map(c => ({ id: c.id, label: c.display, isCorrect: c.id === fullTarget.id }))) });
    } else {
      for (const letterCombos of letterGroups.slice(0, 3)) {
        const target = pickRandom(letterCombos);
        phaseA.push({ type: "tap", prompt: `Which one says \u201C${target.sound}\u201D?`, targetId: target.id, isHarakat: true, hasAudio: true, ttsText: target.audioText, options: shuffle(letterCombos.map(c => ({ id: c.id, label: c.display, isCorrect: c.id === target.id }))) });
      }
    }

    // Phase B
    const phaseB = [];
    const phaseBCount = diff.isMastery ? 2 : Math.min(3, combos.length);
    for (const c of shuffle([...combos]).slice(0, phaseBCount)) {
      const sameLetter = combos.filter(cc => cc.letterId === c.letterId);
      phaseB.push({ type: "letter_to_name", prompt: c.display, promptSubtext: "What sound does this make?", targetId: c.id, isHarakat: true, ttsText: c.audioText, options: shuffle(sameLetter.map(cc => ({ id: cc.id, label: `\u201C${cc.sound}\u201D`, isCorrect: cc.id === c.id }))) });
    }

    // Phase C
    const phaseC = [];
    const letterIds = Object.keys(byLetter);
    if (letterIds.length >= 2) {
      const crossCount = diff.isMastery ? 2 : 1;
      const usedHarakat = new Set();
      for (let i = 0; i < crossCount; i++) {
        const available = ["fatha", "kasra", "damma"].filter(h => !usedHarakat.has(h));
        if (available.length === 0) break;
        const harakahId = pickRandom(available);
        usedHarakat.add(harakahId);
        const sameMark = combos.filter(c => c.harakahId === harakahId);
        if (sameMark.length >= 2) {
          // Pick target first, then build options that INCLUDE the target
          const target = pickRandom(sameMark);
          const others = sameMark.filter(c => c.id !== target.id);
          const opts = [target, ...shuffle(others).slice(0, 2)];
          phaseC.push({ type: "tap", prompt: `Which letter says \u201C${target.sound}\u201D?`, targetId: target.id, isHarakat: true, hasAudio: true, ttsText: target.audioText, options: shuffle(opts.map(c => ({ id: c.id, label: c.display, isCorrect: c.id === target.id }))) });
        }
      }
    }

    // Phase D
    const phaseD = [];
    if (lesson.reviewIds?.length > 0) {
      const reviewCount = diff.isMastery ? 2 : 1;
      const reviewCombos = generateHarakatCombos(lesson.reviewIds);
      const usedReviewLetters = new Set();
      for (let i = 0; i < reviewCount && reviewCombos.length > 0; i++) {
        const available = reviewCombos.filter(c => !usedReviewLetters.has(c.letterId));
        if (available.length === 0) break;
        const target = pickRandom(available);
        usedReviewLetters.add(target.letterId);
        const sameLetter = reviewCombos.filter(c => c.letterId === target.letterId);
        phaseD.push({ type: "tap", prompt: `Review: which says \u201C${target.sound}\u201D?`, targetId: target.id, isHarakat: true, hasAudio: true, ttsText: target.audioText, options: shuffle(sameLetter.map(c => ({ id: c.id, label: c.display, isCorrect: c.id === target.id }))) });
      }
    }

    qs.push(...phaseA, ...phaseB, ...phaseC, ...phaseD);
    const maxQs = diff.isMastery ? 10 : 8;
    return qs.slice(0, maxQs);
  }

  // Single harakah applied lesson
  for (const c of combos) {
    qs.push({ type: "tap", prompt: `Which one says \u201C${c.sound}\u201D?`, targetId: c.id, isHarakat: true, hasAudio: true, ttsText: c.audioText, options: shuffle(combos.map(cc => ({ id: cc.id, label: cc.display, isCorrect: cc.id === c.id }))) });
  }
  for (const c of combos) {
    qs.push({ type: "letter_to_name", prompt: c.display, promptSubtext: "What sound does this make?", targetId: c.id, isHarakat: true, ttsText: c.audioText, options: shuffle(combos.map(cc => ({ id: cc.id, label: `\u201C${cc.sound}\u201D`, isCorrect: cc.id === c.id }))) });
  }
  return qs;
}
