import { getLetter } from "../../data/letters.js";
import { shuffle, pickRandom, makeOpts, makeSoundOpts, SOUND_PROMPTS } from "./shared.js";

export function generateContrastQs(lesson) {
  const teach = (lesson.teachIds || []).map(id => getLetter(id));
  const qs = [];

  // Round 1: hear sound, pick letter
  for (const t of teach) {
    qs.push({ type: "audio_to_letter", prompt: pickRandom(SOUND_PROMPTS.contrast_lesson_audio), targetId: t.id, hasAudio: true, options: makeOpts(teach, t.id) });
  }

  // Round 2: see letter, pick sound description
  for (const t of teach) {
    qs.push({ type: "letter_to_sound", prompt: t.letter, promptSubtext: pickRandom(SOUND_PROMPTS.contrast_lesson_visual), targetId: t.id, optionMode: "sound", options: makeSoundOpts(teach, t.id) });
  }

  // Round 3: hear sound again (reinforcement)
  for (const t of shuffle([...teach])) {
    qs.push({ type: "audio_to_letter", prompt: pickRandom(SOUND_PROMPTS.contrast_lesson_audio), targetId: t.id, hasAudio: true, options: makeOpts(teach, t.id) });
  }

  // Round 4: see letter, pick sound (final check)
  for (const t of teach) {
    qs.push({ type: "letter_to_sound", prompt: t.letter, promptSubtext: `Which sound is ${t.name}?`, targetId: t.id, optionMode: "sound", options: makeSoundOpts(teach, t.id) });
  }

  return qs.slice(0, 6);
}
