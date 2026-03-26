import { ARABIC_LETTERS, getLetter } from "../../data/letters.js";
import { shuffle, getDistractors, getConfusionDistractors, getRuleDistractors, makeOpts, makeNameOpts, makeSoundOpts, getSoundPrompt, getLetterSoundPrompt, SOUND_CONFUSION_MAP } from "./shared.js";

/**
 * Generate questions for checkpoint lessons.
 *
 * Phase 1 checkpoint: visual recognition questions (tap, rule, name/letter matching)
 * Phase 2 checkpoint: sound mastery questions (audio-to-letter, letter-to-sound, contrast)
 */
export function generateCheckpointQs(lesson, progress) {
  if (lesson.phase === 2) {
    return generateSoundCheckpointQs(lesson, progress);
  }
  return generateRecognitionCheckpointQs(lesson, progress);
}

/**
 * Phase 1 checkpoint: visual recognition.
 */
function generateRecognitionCheckpointQs(lesson, progress) {
  const allIds = lesson.teachIds || [];
  const allPool = [...allIds];
  const qs = [];

  const { struggled, unseen, strong } = classifyLetters(allIds, progress);

  const weightedPool = [
    ...struggled, ...struggled, ...struggled,
    ...unseen, ...unseen, ...unseen,
    ...strong,
  ];

  const guaranteed = shuffle([...allIds]).slice(0, Math.min(allIds.length, 15));
  const remaining = 15 - guaranteed.length;

  const extra = [];
  for (let i = 0; i < remaining; i++) {
    const pool = weightedPool.length > 0 ? weightedPool : allIds;
    extra.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  const questionLetterIds = shuffle([...guaranteed, ...extra]);
  const qTypes = ["tap", "name_to_letter", "letter_to_name", "rule", "find"];

  for (let i = 0; i < Math.min(questionLetterIds.length, 15); i++) {
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

  return shuffle(qs).slice(0, 15);
}

/**
 * Phase 2 checkpoint: sound mastery.
 *
 * Question types:
 * - audio_to_letter: play a sound, pick the correct letter (tests listening)
 * - letter_to_sound: show a letter, pick the correct sound description (tests recall)
 * - contrast_audio: play a sound from a confusable pair, pick correctly (tests discrimination)
 *
 * Weights toward letters the user has struggled with in sound skills.
 */
function generateSoundCheckpointQs(lesson, progress) {
  const allIds = lesson.teachIds || [];
  const allPool = [...allIds];
  const qs = [];

  const { struggled, unseen, strong } = classifyLetters(allIds, progress);

  const weightedPool = [
    ...struggled, ...struggled, ...struggled,
    ...unseen, ...unseen, ...unseen,
    ...strong,
  ];

  const guaranteed = shuffle([...allIds]).slice(0, Math.min(allIds.length, 15));
  const remaining = 15 - guaranteed.length;

  const extra = [];
  for (let i = 0; i < remaining; i++) {
    const pool = weightedPool.length > 0 ? weightedPool : allIds;
    extra.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  const questionLetterIds = shuffle([...guaranteed, ...extra]);

  // Rotate through sound question types
  const qTypes = ["audio_to_letter", "letter_to_sound", "audio_to_letter", "contrast_audio", "letter_to_sound"];

  for (let i = 0; i < Math.min(questionLetterIds.length, 15); i++) {
    const lid = questionLetterIds[i];
    const t = getLetter(lid);
    if (!t) continue;

    const type = qTypes[i % qTypes.length];

    if (type === "audio_to_letter") {
      // Play the letter's sound, user picks the correct letter
      const d = getConfusionDistractors(t.id, allPool, 2);
      const hasConfusion = d.some(l => (SOUND_CONFUSION_MAP[t.id] || []).includes(l.id));
      qs.push({
        type: "audio_to_letter",
        prompt: getSoundPrompt("audio_to_letter", hasConfusion),
        targetId: t.id,
        hasAudio: true,
        options: makeOpts([t, ...d], t.id),
      });
    } else if (type === "letter_to_sound") {
      // Show the letter, user picks the correct sound description
      const d = getConfusionDistractors(t.id, allPool, 2);
      qs.push({
        type: "letter_to_sound",
        prompt: t.letter,
        promptSubtext: getLetterSoundPrompt(t),
        targetId: t.id,
        optionMode: "sound",
        options: makeSoundOpts([t, ...d], t.id),
      });
    } else if (type === "contrast_audio") {
      // Play a sound from a confusable pair
      const confusionIds = (SOUND_CONFUSION_MAP[t.id] || []).filter(id => allPool.includes(id));
      if (confusionIds.length > 0) {
        const confusor = getLetter(confusionIds[0]);
        if (confusor) {
          qs.push({
            type: "audio_to_letter",
            prompt: getSoundPrompt("contrast_audio", true),
            targetId: t.id,
            hasAudio: true,
            options: makeOpts([t, confusor], t.id),
          });
        }
      } else {
        // No confusable pair — fall back to audio_to_letter
        const d = getConfusionDistractors(t.id, allPool, 2);
        qs.push({
          type: "audio_to_letter",
          prompt: getSoundPrompt("audio_to_letter", false),
          targetId: t.id,
          hasAudio: true,
          options: makeOpts([t, ...d], t.id),
        });
      }
    }
  }

  return shuffle(qs).slice(0, 15);
}

/** Classify letters by user performance. */
function classifyLetters(allIds, progress) {
  const struggled = [];
  const unseen = [];
  const strong = [];

  for (const id of allIds) {
    const entry = progress?.[id];
    if (!entry || (entry.attempts ?? 0) === 0) {
      unseen.push(id);
    } else if ((entry.correct ?? 0) / (entry.attempts ?? 1) < 0.7) {
      struggled.push(id);
    } else {
      strong.push(id);
    }
  }

  return { struggled, unseen, strong };
}
