# Iqra AI

A free, progressive, game-based web app teaching users to read the Quran in Arabic. Targets learners of all ages — especially non-native speakers beginning Quranic education. Bite-sized ~2-minute lessons with structured progression, audio pronunciation, adaptive feedback, spaced repetition, and pronunciation guidance for difficult Arabic sounds.

## Tech Stack

- **Frontend**: React 18.3 + Vite 8, JSX components
- **Backend**: Express 5 (Node.js) — TTS proxy + static serving
- **Animations**: Framer Motion 12
- **Audio**: Web Audio API (SFX) + pre-recorded WAV files + Google Cloud TTS (MP3)
- **Styling**: Vanilla CSS with custom properties (tokens.css) + inline styles for dynamic values
- **Persistence**: Browser localStorage only — no database, no auth. Export/import backup supported.
- **Testing**: Vitest 4.1 + jsdom (145 tests across 5 files)
- **PWA**: Service worker + manifest for offline support and Add to Home Screen
- **Fonts**: Amiri / Traditional Arabic (Arabic serif) + Inter (English body) + Lora (English headings)

## Commands

- `npm run dev` — Start Vite dev server (frontend)
- `node server.js` — Start Express backend (port 3001, TTS proxy)
- `npm test` — Run tests (vitest run)
- `npm run build` — Production build to `dist/`

## Project Structure

```
src/
  App.jsx                        — Root component, screen routing, hash-based navigation
  main.jsx                       — React entry point
  components/
    OnboardingScreen.jsx         — 8-step first-time welcome flow
    PostLessonOnboarding.jsx     — Post-lesson motivation/goal setting (3 steps)
    HomeScreen.jsx               — Main dashboard (hero card, journey path, review card)
    ProgressScreen.jsx           — Letter mastery grid, phase progress, data export/import
    PhaseCompleteScreen.jsx      — Phase unlock celebration
    ReturnHadithScreen.jsx       — Return-user motivational interstitial (hadith + floating letters)
    PronunciationGuide.jsx       — Pronunciation popup modals (single letter + comparison)
    Icons.jsx                    — SVG icon components
    lesson/
      LessonScreen.jsx           — Main lesson orchestrator (intro -> quiz -> summary)
      LessonIntro.jsx            — Lesson intro slide with pronunciation guides
      LessonQuiz.jsx             — Quiz question display, answer feedback, pronunciation comparison
      LessonMidCelebrate.jsx     — Halfway celebration
      LessonSummary.jsx          — Lesson completion summary with confetti
      LessonSpeak.jsx            — Speaking practice (feature-flagged, not yet enabled)
      LessonErrorBoundary.jsx    — Error boundary for lesson crashes
      StreakBanner.jsx            — Animated streak counter display
      useLessonQuiz.js           — Quiz state machine & progression logic (hook)
  data/
    lessons.js                   — 84 lesson definitions (3 phases, ~10 modules)
    letters.js                   — 28 Arabic letters with metadata + articulation data (13 letters)
    harakat.js                   — 3 vowel marks + dynamic letter-vowel combo generation
  lib/
    progress.js                  — localStorage read/write, schema migration (v3), habit tracking, export/import
    mastery.js                   — Entity/skill/confusion tracking, SRS scheduling
    selectors.js                 — Derived selectors (lesson counts, phase progress, review planning)
    audio.js                     — Web Audio API SFX engine + letter audio playback + preloading
    tts.js                       — Google Cloud TTS client (frontend, with retry + caching)
    engagement.js                — Microcopy pools, performance bands, summary messaging
    features.js                  — Feature flags (speakingPractice: false)
    motion.js                    — Animation presets (springs, easings, duration tokens)
    dateUtils.js                 — Shared date utilities (getTodayDateString, getDayDifference, addDateDays)
    questions/
      index.js                   — Question generator dispatcher (routes by lessonMode)
      recognition.js             — Phase 1: letter recognition questions (tap, rule, name_to_letter, etc.)
      sound.js                   — Phase 2: letter sound questions (audio_to_letter, letter_to_sound)
      contrast.js                — Phase 2: confusable sound contrast questions
      harakat.js                 — Phase 3: vowel mark questions
      checkpoint.js              — Phase checkpoint mastery tests
      review.js                  — Spaced repetition review session generator
      shared.js                  — Utility functions (shuffle, pickRandom, distractor selection, confusion map)
      explanations.js            — Wrong-answer feedback with contextual explanations
  hooks/
    useIqraAppState.js           — Central app state hook (progress, mastery, habit, onboarding, saveFailed)
  styles/
    index.css                    — Master CSS import
    tokens.css                   — Color, typography, spacing, shadow variables
    base.css                     — Global resets, app-shell layout
    animations.css               — 20+ keyframe animations + prefers-reduced-motion support
    components.css               — Component-scoped styles (buttons, cards, quiz options, nav, phases)
  tests/
    progress.test.js             — Progress migration, schema versioning, habit tracking
    mastery.test.js              — Entity/skill/confusion recording, SRS scheduling
    selectors.test.js            — Derived selectors, phase counts, unlock logic, review planning
    quizProgress.test.js         — Quiz progression, streak behavior, wrong-answer recycling
    summaryAndReview.test.js     — Summary messaging, review session generation
public/
  manifest.json                  — PWA manifest (standalone, portrait, theme colors)
  sw.js                          — Service worker (cache-first audio, network-first app shell)
  audio/
    sounds/                      — 28 pre-recorded letter sounds (WAV)
    names/                       — 28 pre-recorded letter names (WAV)
    effects/                     — 19 SFX files (correct, wrong, streaks, transitions, etc.)
    generated/                   — Server-cached TTS audio (MP3, auto-pruned at 500 files)
server.js                        — Express backend (TTS proxy + static serving + health check)
index.html                       — Entry HTML with PWA meta tags, font loading, SW registration
```

## Architecture

### Screen Flow & Routing
Hash-based routing for browser back button support. Screens managed via `useState` in `App.jsx` with `pushState`/`popstate` listeners. Safe back-navigation to home/progress/lesson; transient screens (phaseComplete, postLessonOnboarding) redirect to home on back.

```
Onboarding (8 steps) -> Lesson 1 -> PostLessonOnboarding (3 steps) -> HomeScreen
HomeScreen <-> ProgressScreen (bottom nav tabs)
HomeScreen -> LessonScreen (intro -> quiz -> [midCelebrate] -> summary) -> HomeScreen
HomeScreen -> Review Session -> HomeScreen
ReturnHadithScreen (shown on return after 1+ day gap, once per day)
PhaseCompleteScreen (shown when all lessons in a phase are completed)
```

### Learning Phases (84 lessons total)
1. **Phase 1 — Letter Recognition** (43 lessons, modules 1.1-1.6): Visually identify all 28 Arabic letters by shape. Grouped by visual families (same base shape, different dots). Includes a Phase 1 checkpoint.
2. **Phase 2 — Letter Sounds** (23 lessons, modules 2.1-2.10): 13 sound lessons (audio-to-letter, letter-to-sound) + 9 contrast lessons (confusable pairs like Seen/Saad, Haa/Ha, Ta/Taa, Dhaal/Tha) + 1 checkpoint. Unlocks after 15 Phase 1 lessons completed.
3. **Phase 3 — Harakat / Short Vowels** (18 lessons, modules 3.1-3.6): Fatha, Kasra, Damma vowel marks applied to all 28 letters. Builds from single vowels on Ba/Ta/Tha to mixed harakat on all letters. Unlocks after 12 Phase 2 lessons completed.

### Lesson IDs
Lesson IDs are not sequential — id:84 exists between id:63 and id:64 (inserted contrast lesson). Array position in `LESSONS` determines order, not ID value. Tests derive counts from the LESSONS array, not hardcoded numbers.

### State Management
Single `useIqraAppState` hook manages all global state via `useState` (initialized lazily from localStorage). Progress persisted to localStorage on every state change via `useEffect`. `saveFailed` flag surfaces localStorage exhaustion as a user-visible warning banner.

Key state shape:
- `completedLessonIds: number[]` — completed lesson IDs (sorted, deduplicated, validated)
- `mastery: { entities, skills, confusions }` — per-letter/combo tracking with SRS
- `habit: { lastPracticeDate, currentWird, longestWird, todayLessonCount }` — Wird streak
- `onboardingData: { onboarded, startingPoint, motivation, dailyGoal, commitmentComplete }` — user profile

### Mastery & SRS
- **Entities**: Track each letter (`letter:2`) and harakat combo (`combo:ba-fatha`) — correct/attempts, lastSeen, nextReview, intervalDays, sessionStreak
- **Skills**: Track visual recognition (`visual:2`), sound ID (`sound:2`), contrast discrimination (`contrast:2-3`), harakat reading (`harakat:...`)
- **Confusions**: Track commonly confused pairs (`recognition:2->3`, `sound:7->8`) with count and lastSeen
- **SRS intervals**: 1 day -> 3 days -> 7 days -> 14 days -> 30 days. Reset to 1 on failure.
- **Review queue**: Due items (nextReview <= today) + weak entities (<60% accuracy, min 3 attempts) + top 5 confusion pairs. Max 12 items per review session.

### Pronunciation Guide System
13 of 28 letters have rich `articulation` data in `letters.js` — the difficult Arabic sounds that English speakers struggle with:
- **Emphatics**: Saad(14), Daad(15), Taa(16), Dhaa(17)
- **Throat letters**: Haa(6), Khaa(7), Ain(18), Ghain(19), Qaf(21)
- **Interdentals**: Tha(4), Dhaal(9)
- **Other**: Ra(10), Ha(26)

Each articulation object contains: `place` (tongue position), `manner` (airflow description), `breath` (voiced/unvoiced), `confusedWith` (common mix-ups with `{id:N}` tokens for inline Arabic references), `tryThis` (physical exercise the user can do).

**PronunciationGuide.jsx** provides two components:
- `PronunciationCard` — Single-letter popup modal. In contrast lessons, accepts `contrastWithId` prop to override confusion section with the specific lesson pair.
- `PronunciationCompare` — Side-by-side comparison popup for wrong-answer panels in sound questions.

Text fields use `{id:N}` tokens (e.g., `{id:12}`) that render as Arabic glyph + (Name) inline references.

### Audio System (3 layers)
1. **SFX** — 19 pre-recorded WAV/MP3 files loaded via Web Audio API `decodeAudioData`. Volume-controlled per file. Streak audio overlap prevention via `currentStreakSource` tracking.
2. **Letter audio** — 56 pre-recorded WAV files (28 sounds + 28 names). First 8 letters preloaded on app start. Others fetched and cached on demand.
3. **TTS** — Google Cloud TTS via Express proxy (`GET /api/tts?text=<arabic>`) for Phase 3 harakat combos. Voice: ar-XA-Wavenet-A (female) at 0.85x speed. Server-side file cache with SHA-256 content hashing. Frontend in-memory blob URL cache. Retry once on 5xx/network errors.

### Question Generation
Each lesson mode has a dedicated generator in `src/lib/questions/`. Question types:
- `tap` / `find` / `name_to_letter` / `letter_to_name` / `rule` — Phase 1 recognition
- `audio_to_letter` / `letter_to_sound` / `contrast_audio` — Phase 2 sound
- Harakat mark-to-sound matching — Phase 3

Distractors are pedagogically meaningful: visual family members for recognition, `SOUND_CONFUSION_MAP` entries for sound questions. Wrong answers are recycled once (shuffled options) to the end of the queue. Mid-lesson celebration at ~45% for 8+ question lessons. Streak celebrations at 3, 5, 7 correct in a row.

### Engagement & Microcopy
`engagement.js` provides rotating, mode-aware microcopy pools:
- Correct answer messages (recognition / sound / harakat variants)
- Wrong answer encouragement
- Streak copy, mid-quiz encouragement
- Completion headlines/sublines tiered by accuracy (perfect/great/good/struggling)
- Performance bands (strong >= 80%, partial >= 50%, weak < 50%) for honest summary messaging
- Islamic closing quotes, continuation copy, unlock copy

### Data Safety
- `saveProgress()` returns boolean success/failure. `saveFailed` state triggers a fixed red warning banner.
- Export: `exportProgressJSON()` downloads a timestamped `.json` backup file.
- Import: `importProgressJSON()` restores from a backup file with validation.
- Both accessible from Progress screen "Your Data" section.

### PWA
- `manifest.json`: standalone display, portrait orientation, theme color #163323.
- `sw.js`: Cache-first for audio files (WAV/MP3). Network-first with cache fallback for app shell. Network-only for `/api/*` (TTS must be fresh). Cache name versioned (`iqra-v1`).
- Icons expected at `/icons/icon-192.png` and `/icons/icon-512.png` (not yet created).

## Design Tokens

```css
--c-bg:            #F8F6F0   /* warm beige — page background */
--c-bg-warm:       #F2EADE   /* warmer beige — gradients, onboarding */
--c-bg-card:       #FFFFFF   /* white — card backgrounds */
--c-primary:       #163323   /* deep green — buttons, success, primary actions */
--c-primary-light: #255038   /* lighter green — secondary buttons */
--c-primary-soft:  #E8F0EB   /* soft green — backgrounds, highlights */
--c-primary-dark:  #0F2419   /* darkest green — text on green backgrounds */
--c-accent:        #C4A464   /* gold — streaks, celebrations, Wird, accents */
--c-accent-light:  #F5EDDB   /* soft gold — accent backgrounds */
--c-danger:        #BD524D   /* rust red — errors, wrong answers */
--c-danger-light:  #FCE6E5   /* soft red — error backgrounds */
--c-text:          #163323   /* deep green — primary text (same as primary) */
--c-text-soft:     #52545C   /* gray — secondary text */
--c-text-muted:    #8A857A   /* warm gray — tertiary text, labels */
--c-border:        #EBE6DC   /* warm light gray — borders, dividers */
--font-body:       'Inter', sans-serif
--font-heading:    'Lora', serif
--font-arabic:     'Traditional Arabic', 'Amiri', serif
--radius:          32px      /* large cards, onboarding panels */
--radius-btn:      16px      /* buttons, quiz options */
--radius-sm:       12px      /* small elements */
```

## Conventions

- Mobile-first design, max-width 430px, centered in viewport
- Arabic text uses `dir="rtl"` on individual spans, not page-level RTL
- Framer Motion for complex animations (entrance/exit, springs, stagger), CSS keyframes for simple loops (float, pulse, breathe)
- `prefers-reduced-motion: reduce` respected — all animations suppressed
- No CSS framework — inline styles for dynamic/conditional values, CSS classes for static styles
- Components are single-file JSX
- All lesson data statically defined in `src/data/lessons.js` — no runtime generation of curriculum
- Hash-based routing via `pushState`/`popstate` — no routing library
- Confetti via canvas-confetti on lesson completion (>= 70% accuracy)
- `activeTab` derived from `screen` state (not independent state) to prevent desync
- `useEffect` dependency arrays must be complete — functions used in effects are wrapped in `useCallback`
- Date utilities centralized in `dateUtils.js` — no duplicate implementations
- SRS logic lives in `mastery.js` only — `progress.js` re-exports for backward compat
- Tests derive lesson counts from `LESSONS` array, not hardcoded numbers

## Testing Shortcuts

Unlock all Phase 1 + Phase 2 lessons (paste in DevTools console):
```js
let p = JSON.parse(localStorage.getItem("iqra_progress"));
p.lessonCompletion.completedLessonIds = Array.from({length: 65}, (_, i) => i + 1).concat([84]);
p.onboarded = true;
p.onboardingCommitmentComplete = true;
p.onboardingVersion = 2;
localStorage.setItem("iqra_progress", JSON.stringify(p));
location.reload();
```

Reset all progress:
```js
localStorage.removeItem("iqra_progress");
localStorage.removeItem("hasCompletedOnboarding");
localStorage.removeItem("lastHadithInterstitialDate");
location.reload();
```
