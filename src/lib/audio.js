// ── Web Audio API engine for SFX ──
let audioCtx = null;
const bufferCache = {};

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

const SFX_FILES = [
  'correct.wav', 'wrong.wav', 'lesson_complete.mp3',
  'lesson_complete_perfect.mp3', 'phase_complete.wav',
  'phase_unlock.wav', 'mid_lesson_celebration.wav',
  'streak_tier1.wav', 'streak_tier2.wav', 'streak_tier3.wav',
  'onboarding_complete.wav', 'onboarding_advance.wav',
  'lesson_start.wav', 'lesson_node_tap.wav',
  'audio_play_button.wav', 'screen_transition.wav',
  'review_due.wav', 'wird_milestone.wav', 'button_tap.wav',
];

const SFX_VOLUMES = {
  'button_tap.wav': 0.4,
  'screen_transition.wav': 0.5,
  'lesson_node_tap.wav': 0.6,
  'audio_play_button.wav': 0.6,
  'onboarding_advance.wav': 0.6,
};

export function preloadAudio() {
  const ctx = getAudioContext();
  SFX_FILES.forEach(filename => {
    fetch(`/audio/effects/${filename}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        bufferCache[filename] = decoded;

      })
      .catch(e => console.warn(`[SFX] Failed to preload ${filename}:`, e.message));
  });

  // Preload first 8 letter audio files (most common in early lessons)
  const PRELOAD_LETTER_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
  PRELOAD_LETTER_IDS.forEach(id => {
    ['name', 'sound'].forEach(type => {
      const path = getAudioPath(id, type);
      if (path && !bufferCache[path]) {
        fetch(`/${path}`)
          .then(res => res.ok ? res.arrayBuffer() : Promise.reject())
          .then(buf => ctx.decodeAudioData(buf))
          .then(decoded => { bufferCache[path] = decoded; })
          .catch(() => {});
      }
    });
  });
}

function playSound(filename, volume) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const buffer = bufferCache[filename];
    if (!buffer) {
      // Fetch on demand — first play of this sound will be missed,
      // but subsequent plays will work immediately from cache.
      fetch(`/audio/effects/${filename}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then(buf => ctx.decodeAudioData(buf))
        .then(decoded => { bufferCache[filename] = decoded; })
        .catch(e => console.warn(`[SFX] On-demand load failed for ${filename}:`, e.message));
      return null;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const vol = volume ?? SFX_VOLUMES[filename] ?? 1.0;
    if (vol < 1.0) {
      const gain = ctx.createGain();
      gain.gain.value = vol;
      source.connect(gain);
      gain.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }
    source.start(0);
    return source;
  } catch (e) {
    console.error(`[SFX] Error playing ${filename}:`, e);
    return null;
  }
}

// ── Named SFX exports ──
// Keep the exact same function signatures so no other files need changes.

let currentStreakSource = null;

export function sfxCorrect()           { playSound('correct.wav'); }
export function sfxWrong()             { playSound('wrong.wav'); }
export function sfxComplete() {
  if (currentStreakSource) {
    try { currentStreakSource.stop(); } catch(e) {}
    currentStreakSource = null;
  }
  playSound('lesson_complete.mp3');
}
export function sfxCompletePerfect() {
  if (currentStreakSource) {
    try { currentStreakSource.stop(); } catch(e) {}
    currentStreakSource = null;
  }
  playSound('lesson_complete_perfect.mp3');
}
export function sfxPhaseComplete()     { playSound('phase_complete.wav'); }
export function sfxPhaseUnlock()       { playSound('phase_unlock.wav'); }
export function sfxMidLesson()         { playSound('mid_lesson_celebration.wav'); }
export function sfxStreakTier1() {
  if (currentStreakSource) { try { currentStreakSource.stop(); } catch(e) {} }
  currentStreakSource = playSound('streak_tier1.wav');
  if (currentStreakSource) currentStreakSource.onended = () => { currentStreakSource = null; };
}
export function sfxStreakTier2() {
  if (currentStreakSource) { try { currentStreakSource.stop(); } catch(e) {} }
  currentStreakSource = playSound('streak_tier2.wav');
  if (currentStreakSource) currentStreakSource.onended = () => { currentStreakSource = null; };
}
export function sfxStreakTier3() {
  if (currentStreakSource) { try { currentStreakSource.stop(); } catch(e) {} }
  currentStreakSource = playSound('streak_tier3.wav');
  if (currentStreakSource) currentStreakSource.onended = () => { currentStreakSource = null; };
}
export function sfxOnboardingComplete(){ playSound('onboarding_complete.wav'); }
export function sfxOnboardingAdvance() { playSound('onboarding_advance.wav'); }
export function sfxLessonStart()       { playSound('lesson_start.wav'); }
export function sfxNodeTap()           { playSound('lesson_node_tap.wav'); }
export function sfxAudioButton()       { playSound('audio_play_button.wav'); }
export function sfxTransition()        { playSound('screen_transition.wav'); }
export function sfxReviewDue()         { playSound('review_due.wav'); }
export function sfxWirdMilestone()     { playSound('wird_milestone.wav'); }
export function sfxTap()               { playSound('button_tap.wav'); }

// ── Letter audio (unchanged) ──
const LETTER_FILENAMES = {
  1: "alif", 2: "ba", 3: "ta", 4: "thaa", 5: "jeem", 6: "haa", 7: "khaa",
  8: "daal", 9: "dhaal", 10: "ra", 11: "zay", 12: "seen", 13: "sheen",
  14: "saad", 15: "daad", 16: "taa", 17: "dhaa", 18: "ain", 19: "ghain",
  20: "fa", 21: "qaf", 22: "kaf", 23: "laam", 24: "meem", 25: "noon",
  26: "ha", 27: "waw", 28: "ya",
};

const SOUND_FILENAME_OVERRIDES = {
  4: "tha",
  23: "lam",
};

function getAudioPath(id, audioType) {
  const base = LETTER_FILENAMES[id];
  if (!base) return null;
  if (audioType === "sound") {
    const filename = SOUND_FILENAME_OVERRIDES[id] || base;
    return `audio/sounds/${filename}.wav`;
  }
  return `audio/names/${base}.wav`;
}

let currentLetterSource = null;

function stopCurrentLetterAudio() {
  if (currentLetterSource) {
    try { currentLetterSource.stop(); } catch (e) {}
    currentLetterSource = null;
  }
}

export function playLetterAudio(id, audioType = "name") {
  stopCurrentLetterAudio();
  const src = getAudioPath(id, audioType);
  if (!src) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Check buffer cache first
  if (bufferCache[src]) {
    const source = ctx.createBufferSource();
    source.buffer = bufferCache[src];
    source.connect(ctx.destination);
    source.start(0);
    currentLetterSource = source;
    source.onended = () => { if (currentLetterSource === source) currentLetterSource = null; };
    return;
  }

  // Fetch, decode, cache, then play
  fetch(`/${src}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then(buf => ctx.decodeAudioData(buf))
    .then(decoded => {
      bufferCache[src] = decoded;
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.start(0);
      currentLetterSource = source;
      source.onended = () => { if (currentLetterSource === source) currentLetterSource = null; };
    })
    .catch(() => {});
}
