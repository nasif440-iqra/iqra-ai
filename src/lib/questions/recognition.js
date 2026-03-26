import { ARABIC_LETTERS, getLetter } from "../../data/letters.js";
import { shuffle, getKnownIds, getDistractors, getRuleDistractors, makeOpts, makeNameOpts } from "./shared.js";

export function generateRecognitionQs(lesson) {
  const known = getKnownIds(lesson.id);
  const allPool = [...new Set([...known, ...(lesson.teachIds || []), ...(lesson.reviewIds || [])])];
  const teach = (lesson.teachIds || []).map(id => getLetter(id));
  const qs = [];
  const isLater = lesson.id >= 8;

  if (teach.length === 1) {
    const t = teach[0];
    const d1 = getDistractors(t.id, allPool, 1);
    const d2 = getDistractors(t.id, allPool, 2);
    const rd = getRuleDistractors(t, allPool, 2);
    qs.push({ type: "tap", prompt: `Tap ${t.name}`, targetId: t.id, options: makeOpts([t, ...d1], t.id) });
    qs.push({ type: "rule", prompt: t.dots > 0 ? `Tap the letter with ${t.visualRule}` : `Tap the letter with no dots`, targetId: t.id, options: makeOpts([t, ...rd], t.id) });
    qs.push({ type: "name_to_letter", prompt: `Which is ${t.name}?`, targetId: t.id, options: makeOpts([t, ...d2], t.id) });
    qs.push({ type: "letter_to_name", prompt: t.letter, promptSubtext: "What is this letter?", targetId: t.id, options: makeNameOpts([t, ...d2], t.id) });
    qs.push({ type: "find", prompt: `Find ${t.name}`, targetId: t.id, options: makeOpts([t, ...d2], t.id) });
  } else {
    for (const t of teach) { const others = teach.filter(x => x.id !== t.id); const dist = others.length > 0 ? [others[0]] : [getDistractors(t.id, allPool, 1)[0]]; qs.push({ type: "tap", prompt: `Tap ${t.name}`, targetId: t.id, options: makeOpts([t, ...dist], t.id) }); }
    const ruleLetters = shuffle([...teach]).slice(0, 2);
    for (const t of ruleLetters) {
      // Use rule-aware distractors so the answer is unambiguous
      const rd = getRuleDistractors(t, allPool, 2);
      qs.push({ type: "rule", prompt: t.dots > 0 ? `Which has ${t.visualRule}?` : `Which has no dots?`, targetId: t.id, options: makeOpts([t, ...rd], t.id) });
    }
    const nameLetters = shuffle([...teach]).slice(0, 2);
    for (const t of nameLetters) {
      const familyDistractors = isLater ? ARABIC_LETTERS.filter(l => l.family === t.family && l.id !== t.id) : [];
      const optLetters = familyDistractors.length > 0
        ? [t, ...shuffle(familyDistractors).slice(0, 2)]
        : teach.length === 3 ? teach : [...teach, ...getDistractors(t.id, allPool, 1)];
      qs.push({ type: "name_to_letter", prompt: `Which is ${t.name}?`, targetId: t.id, options: makeOpts(optLetters, t.id) });
    }
    const ltnLetter = shuffle([...teach])[0];
    qs.push({ type: "letter_to_name", prompt: ltnLetter.letter, promptSubtext: "What is this letter?", targetId: ltnLetter.id, options: makeNameOpts(teach.length >= 3 ? teach : [...teach, ...getDistractors(ltnLetter.id, allPool, 1)], ltnLetter.id) });
  }
  if (lesson.reviewIds?.length > 0) {
    const rid = shuffle(lesson.reviewIds)[0];
    const rev = getLetter(rid);
    if (rev) { const dists = getDistractors(rev.id, allPool, isLater ? 2 : 1); qs.push({ type: "name_to_letter", prompt: `Review: which is ${rev.name}?`, targetId: rev.id, options: makeOpts([rev, ...dists], rev.id) }); }
  }
  return qs;
}
