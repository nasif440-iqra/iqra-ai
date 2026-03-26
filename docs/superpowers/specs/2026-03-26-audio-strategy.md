# Tila Audio Strategy

**Date**: 2026-03-26
**Status**: Approved

---

## Two Voice Tiers

### Teaching Voice
Used for letters, syllables, pairs, words, and instructional audio across Phases 1-6. Some variance acceptable (existing pre-recorded WAVs don't need re-recording). Goal: clarity and accurate pronunciation, not beauty.

### Recitation Voice
Used for Quran ayah recitation in Phases 7-8. Open-source from a professional reciter (Mishary Rashid Alafasy or similar). Beautiful, reverent, and authentic.

---

## Per-Phase Audio Approach

| Phase | Content Type | Source | Notes |
|-------|-------------|--------|-------|
| 1-3 (existing) | Letter sounds + names | Existing WAVs | Keep as-is |
| 1-3 (existing) | Harakat combos | Google TTS | Upgrade voice model |
| 4 | Letter audio in connected forms | Existing WAVs | Same letter sounds, reuse |
| 5 | Two-letter and three-letter pairs | Upgraded TTS | e.g. ba-ma, ka-ta-ba |
| 6 | Symbol contrasts (short vs long, single vs shaddah) | Upgraded TTS | Contrast pairs need clear, slow audio |
| 7 | Real Quran words | Upgraded TTS (teaching) + open-source reciter (model) | Two layers: TTS for practice, reciter for "how it sounds in the Quran" |
| 8 | Ayah and surah recitation | Open-source Quran audio | Word-by-word + full ayah |

---

## TTS Upgrade for Teaching Voice

The current Google ar-XA-Wavenet-A at 0.85x speed lacks clarity and naturalness. Upgrade options:

### Option 1: Google Journey/Studio Voices (Recommended First)
- Significantly more natural than Wavenet
- Same API, just a voice name change in `server.js`
- Free tier still applies
- Try first — if quality is sufficient, no cost change

### Option 2: ElevenLabs Arabic
- Much more natural than any Google voice
- Cost: ~$0.30 per 1,000 characters
- At Tila's scale (short syllables and words), pennies per user
- Fallback if Google Journey isn't good enough

### Option 3: OpenAI TTS
- `tts-1-hd` model handles Arabic reasonably well
- Cost: $0.03 per 1,000 characters
- Middle ground between Google and ElevenLabs

**Recommendation**: Try Google Journey voices first (free, same infrastructure). If not good enough, switch to ElevenLabs. Both are a config change in `server.js`, not an architecture change.

---

## Open-Source Quran Audio for Phases 7-8

### Verse-Level Audio
Source: EveryAyah.com — provides verse-level MP3 files for dozens of reciters. Predictable URL pattern: `https://everyayah.com/data/{reciter}/{surah_padded}{ayah_padded}.mp3`

### Word-Level Audio
Sources:
- QuranicAudio.com — segmented audio
- Quran.com API — word-by-word timestamps and segmented audio

### Implementation
Download audio files for the 4 target surahs (Al-Ikhlas, Al-Falaq, An-Nas, Al-Fatihah) and store in `audio/quran/`. Approximately 30 ayahs total — small enough to bundle locally. No streaming API needed at this scale.

### Reciter Selection
Mishary Rashid Alafasy recommended — clear articulation, widely recognized, teaching-friendly pace. Available on EveryAyah.com.

---

## Action Items (Sequenced)

### Before Phase 5 Development
1. Test Google Journey Arabic voices — update `TTS_VOICE_NAME` in `server.js`
2. If insufficient, integrate ElevenLabs API as alternative TTS provider
3. Validate upgraded TTS quality on existing harakat combos
4. No re-recording of existing letter WAVs needed

### Before Phase 7-8 Development
1. Download Quran audio for Al-Ikhlas, Al-Falaq, An-Nas, Al-Fatihah from EveryAyah.com
2. Store in `audio/quran/{surah}/{ayah}.mp3`
3. Extract or source word-level audio segments from Quran.com API
4. Store word-level audio alongside verse audio
5. Build audio lookup by surah/ayah/word-position to serve from the word database

### No Changes Needed Now
Phase 4 reuses existing letter audio — the connected forms sound the same as isolated forms. No new audio assets required for the current merge.
