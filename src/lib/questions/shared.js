import { ARABIC_LETTERS, getLetter } from "../../data/letters.js";
import { LESSONS } from "../../data/lessons.js";

export function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function pickRandom(a) { return a[Math.floor(Math.random() * a.length)]; }

// Maps letter IDs to IDs they're commonly confused with
export const SOUND_CONFUSION_MAP = {
  2: [3, 4], 3: [2, 4], 4: [2, 3],
  5: [6, 7], 6: [5, 7], 7: [5, 6],
  8: [9], 9: [8],
  10: [11], 11: [10],
  12: [13, 14], 13: [12],
  14: [15, 12], 15: [14],
  16: [17, 3], 17: [16, 9],
  18: [19, 6], 19: [18, 7],
  20: [21], 21: [20],
  22: [21], 23: [10],
  24: [25], 25: [24],
  26: [6, 18], 27: [28], 28: [27],
};

// ── Prompt pools (separated by actual question modality) ──

export const SOUND_PROMPTS = {
  // User HEARS audio, picks a letter
  audio_to_letter: [
    "Listen carefully \u2014 which letter matches this sound?",
    "Hear the sound and find the right letter",
    "Which letter sounds like this?",
    "Listen \u2014 can you spot the right letter?",
    "Which letter is making this sound?",
  ],
  // User HEARS audio, picks between similar-sounding letters
  contrast_audio: [
    "These sound similar \u2014 listen closely",
    "Listen carefully \u2014 which one sounds right?",
    "Can you tell which letter this is?",
    "Tricky pair \u2014 listen and choose",
  ],
  // User SEES a letter, picks the matching sound description
  letter_to_sound: [
    "Which sound goes with this letter?",
    "What sound do you recognize for this letter?",
    "Match this letter to its sound",
  ],
  // User HEARS audio between confusable letters
  confused_contrast: [
    "These letters sound alike \u2014 listen for the difference",
    "Listen and compare \u2014 which letter is it?",
    "Very similar sounds \u2014 listen closely",
  ],
  // User HEARS audio in a contrast lesson
  contrast_lesson_audio: [
    "These sound similar \u2014 listen closely",
    "One is heavier, one is lighter",
    "Focus on how the sound starts",
    "Listen again and compare",
    "Can you hear the difference?",
    "Pay attention \u2014 which one is it?",
  ],
  // User SEES a letter in a contrast lesson, picks the sound
  contrast_lesson_visual: [
    "Which sound does this letter make?",
    "Match this letter to the right sound",
    "Pick the sound for this letter",
    "What sound goes with this letter?",
  ],
};

/**
 * Get IDs of all letters taught in lessons BEFORE the given lesson.
 * Uses array position in LESSONS (not ID comparison) since IDs are non-sequential.
 */
export function getKnownIds(lessonId) {
  const ids = [];
  for (const l of LESSONS) {
    if (l.id === lessonId) break;
    ids.push(...(l.teachIds || []));
  }
  return [...new Set(ids)];
}

/**
 * Get distractors that contradict a visual rule.
 * For "no dots" questions: distractors MUST have dots.
 * For "N dots above" questions: distractors must NOT share the same visual rule.
 */
export function getRuleDistractors(target, pool, cnt) {
  const hasDots = target.dots > 0;

  // Filter pool to letters that contradict the target's rule
  const validFromPool = pool.filter(id => {
    if (id === target.id) return false;
    const l = getLetter(id);
    if (!l) return false;
    return hasDots ? l.visualRule !== target.visualRule : l.dots > 0;
  });

  if (validFromPool.length >= cnt) {
    return shuffle(validFromPool).slice(0, cnt).map(id => getLetter(id));
  }

  // Not enough in pool — pull from all letters
  const usedIds = new Set([target.id, ...validFromPool]);
  const extra = ARABIC_LETTERS.filter(l => {
    if (usedIds.has(l.id)) return false;
    return hasDots ? l.visualRule !== target.visualRule : l.dots > 0;
  });

  return shuffle([...validFromPool.map(id => getLetter(id)), ...extra]).slice(0, cnt);
}

export function getDistractors(tid, pool, cnt) {
  const av = pool.filter(id => id !== tid);
  if (av.length >= cnt) return shuffle(av).slice(0, cnt).map(id => getLetter(id));
  const ex = ARABIC_LETTERS.filter(l => !pool.includes(l.id) && l.id !== tid).slice(0, cnt - av.length);
  return shuffle([...av.map(id => getLetter(id)), ...ex]).slice(0, cnt);
}

export function getConfusionDistractors(tid, pool, cnt) {
  const confusionIds = (SOUND_CONFUSION_MAP[tid] || []).filter(id => pool.includes(id));
  const otherPool = pool.filter(id => id !== tid && !confusionIds.includes(id));
  const picked = [];
  for (const cid of shuffle(confusionIds)) {
    if (picked.length >= cnt) break;
    const l = getLetter(cid);
    if (l) picked.push(l);
  }
  for (const oid of shuffle(otherPool)) {
    if (picked.length >= cnt) break;
    const l = getLetter(oid);
    if (l) picked.push(l);
  }
  if (picked.length < cnt) {
    const extra = ARABIC_LETTERS.filter(l => l.id !== tid && !picked.some(p => p.id === l.id));
    for (const l of shuffle(extra)) {
      if (picked.length >= cnt) break;
      picked.push(l);
    }
  }
  return picked.slice(0, cnt);
}

export function makeOpts(letters, cid) {
  const seen = new Set();
  const u = letters.filter(l => { if (!l || seen.has(l.id)) return false; seen.add(l.id); return true; });
  return shuffle(u.map(l => ({ id: l.id, label: l.letter, isCorrect: l.id === cid })));
}

export function makeNameOpts(letters, cid) {
  const seen = new Set();
  const u = letters.filter(l => { if (!l || seen.has(l.id)) return false; seen.add(l.id); return true; });
  return shuffle(u.map(l => ({ id: l.id, label: l.name, isCorrect: l.id === cid })));
}

export function makeSoundOpts(letters, cid) {
  const seen = new Set();
  const u = letters.filter(l => { if (!l || seen.has(l.id)) return false; seen.add(l.id); return true; });
  return shuffle(u.map(l => ({ id: l.id, label: `"${l.transliteration}"`, sublabel: l.soundHint, isCorrect: l.id === cid })));
}

export function getSoundPrompt(type, hasConfusion) {
  if (hasConfusion && SOUND_PROMPTS.confused_contrast) {
    return pickRandom(SOUND_PROMPTS.confused_contrast);
  }
  return pickRandom(SOUND_PROMPTS[type] || SOUND_PROMPTS.audio_to_letter);
}

export function getLetterSoundPrompt(letter) {
  return pickRandom([
    `What sound does ${letter.name} make?`,
    `This is ${letter.name} \u2014 which sound matches it?`,
    `Which sound belongs to ${letter.name}?`,
    `Pick the sound for ${letter.name}`,
  ]);
}

// ── Question validation safeguard ──

/**
 * Structured validation: returns { valid: true } or { valid: false, reason: string }.
 * Checks structural integrity, option validity, and mode-specific flags.
 */
export function validateQuestion(q) {
  if (!q) return { valid: false, reason: "null_question" };
  if (!q.prompt && !q.hasAudio) return { valid: false, reason: "empty_prompt" };
  if (!q.options || !Array.isArray(q.options)) return { valid: false, reason: "missing_options" };
  if (q.options.length < 2) return { valid: false, reason: "too_few_options" };

  // Check option shape
  for (let i = 0; i < q.options.length; i++) {
    const o = q.options[i];
    if (!o || o.id == null || o.label == null) return { valid: false, reason: "invalid_option_shape" };
  }

  // Duplicate option IDs
  const ids = q.options.map(o => o.id);
  if (new Set(ids).size !== ids.length) return { valid: false, reason: "duplicate_option_ids" };

  const correct = q.options.filter(o => o.isCorrect);
  if (correct.length === 0) return { valid: false, reason: "zero_correct_answers" };
  if (correct.length > 1) return { valid: false, reason: "multiple_correct_answers" };

  // Target must be among the options
  if (q.targetId != null && !q.options.some(o => o.id === q.targetId)) {
    return { valid: false, reason: "missing_target" };
  }

  // Mode-specific checks
  if (q.type === "audio_to_letter" && !q.hasAudio) return { valid: false, reason: "missing_audio_flag" };
  if (q.type === "letter_to_sound" && q.optionMode !== "sound") return { valid: false, reason: "wrong_option_mode" };

  return { valid: true, reason: null };
}

/**
 * Build a safe fallback question when a generated question fails validation.
 * Uses the simplest reliable question types: tap or name_to_letter.
 */
export function buildFallbackQuestion(targetId, pool) {
  const t = getLetter(targetId);
  if (!t) return null;
  const dists = getDistractors(t.id, pool.length > 0 ? pool : [t.id], 2);
  if (dists.length === 0) return null;
  // Alternate between tap and name_to_letter
  const useTap = Math.random() > 0.5;
  return useTap
    ? { type: "tap", prompt: `Tap ${t.name}`, targetId: t.id, options: makeOpts([t, ...dists], t.id) }
    : { type: "name_to_letter", prompt: `Which is ${t.name}?`, targetId: t.id, options: makeOpts([t, ...dists], t.id) };
}

/**
 * Filter questions, replacing invalid ones with fallback questions when possible.
 * Logs structured diagnostics in development for every rejection.
 */
export function filterValidQuestions(qs, lesson) {
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
  const pool = lesson?.teachIds || [];

  return qs.map(q => {
    const result = validateQuestion(q);
    if (result.valid) return q;

    // Dev diagnostics
    if (isDev) {
      console.warn(
        `[Quiz] Invalid question rejected:`,
        `\n  lesson: ${lesson?.id ?? "?"} (${lesson?.lessonMode ?? "?"})`,
        `\n  type: ${q?.type}`,
        `\n  prompt: "${q?.prompt}"`,
        `\n  reason: ${result.reason}`,
        `\n  options: ${q?.options?.length ?? 0} (correct: ${q?.options?.filter(o => o.isCorrect).length ?? 0})`,
        `\n  targetId: ${q?.targetId}`,
        `\n  targetInOpts: ${q?.options?.some(o => o.id === q?.targetId) ?? false}`
      );
    }

    // Attempt fallback
    if (q?.targetId != null) {
      const fb = buildFallbackQuestion(q.targetId, pool);
      if (fb && validateQuestion(fb).valid) {
        if (isDev) console.info(`[Quiz] Replaced with fallback: ${fb.type} for target ${fb.targetId}`);
        return fb;
      }
    }

    return null;
  }).filter(Boolean);
}
