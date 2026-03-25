// Server-backed Arabic TTS for Phase 3 harakat combo audio.
//
// Calls /api/tts on the backend which uses Google Cloud Text-to-Speech.
// Secrets stay server-side — the frontend only sends Arabic text and
// receives playable MP3 audio.
//
// This replaces the browser Web Speech API approach which was unreliable
// because Chrome on Windows typically has no Arabic voices installed.

// In-memory cache: avoids re-fetching audio for text already played this session.
// The server also has a persistent file cache, so repeated requests are fast
// even across page reloads.
const audioCache = new Map();

// Track the currently playing audio so we can stop it on rapid taps
let currentAudio = null;

// Fetch MP3 blob URL from backend. Retries once on transient (network/5xx) failure.
// Returns a blob URL on success, null on failure.
async function fetchTtsAudio(normalizedText) {
  const url = `/api/tts?text=${encodeURIComponent(normalizedText)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url);

      // 4xx = client error (bad input) — no point retrying
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        console.error(`[TTS] fetch rejected (${res.status}): ${body.error || res.statusText}`);
        return null;
      }

      // 5xx or other server error — retry once
      if (!res.ok) {
        if (attempt === 1) {
          console.warn(`[TTS] server error (${res.status}), retrying once...`);
          continue;
        }
        console.error(`[TTS] server error (${res.status}) after retry`);
        return null;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        console.error("[TTS] received empty audio response");
        return null;
      }


      return URL.createObjectURL(blob);
    } catch (err) {
      // Network error (offline, DNS, timeout) — retry once
      if (attempt === 1) {
        console.warn(`[TTS] network error, retrying: ${err.message}`);
        continue;
      }
      console.error(`[TTS] network error after retry: ${err.message}`);
      return null;
    }
  }
  return null;
}

/**
 * Play generated Arabic audio for the given text.
 *
 * Fetches MP3 from the backend TTS endpoint, caches the blob URL,
 * and plays it through a normal Audio element. Reusable for any Arabic
 * text — harakat combos now, full words later.
 *
 * @param {string} text - Arabic text to speak (e.g. "بَ", "بِسْمِ")
 * @returns {Promise<boolean>} true if audio played, false on failure
 */
export async function playGeneratedArabicAudio(text) {
  // Normalize to NFC so cache keys are consistent with the server
  const normalizedText = text?.normalize("NFC");
  if (!normalizedText || normalizedText.trim().length === 0) {
    console.warn("[TTS] called with empty text");
    return false;
  }

  // Stop any currently playing generated audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  try {
    let blobUrl = audioCache.get(normalizedText);

    if (!blobUrl) {
      blobUrl = await fetchTtsAudio(normalizedText);
      if (!blobUrl) return false;
      audioCache.set(normalizedText, blobUrl);
    }

    // Play the audio
    const audio = new Audio(blobUrl);
    currentAudio = audio;

    audio.addEventListener("ended", () => {
      if (currentAudio === audio) currentAudio = null;
    });
    audio.addEventListener("error", () => {
      console.error("[TTS] audio element error:", audio.error?.message);
    });

    await audio.play();
    return true;
  } catch (err) {
    console.error("[TTS] playback failed:", err.message);
    currentAudio = null;
    return false;
  }
}
