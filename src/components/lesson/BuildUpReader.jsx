import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playGeneratedArabicAudio } from "../../lib/tts.js";
import { playLetterAudio, sfxTap } from "../../lib/audio.js";

/**
 * BuildUpReader — shows a word being constructed right-to-left, one segment at a time.
 *
 * Exercise data shape:
 *   type: "buildup" | "buildup_pair" | "buildup_word"
 *   segments: [{ arabic, sound, letterId }]
 *   fullWord: { arabic, transliteration, ttsText }
 *   contextWord: null | { arabic, transliteration, meaning, surahRef }
 *   explanation: string
 *
 * Props: { exercise, onComplete }
 */
export default function BuildUpReader({ exercise, onComplete }) {
  const { segments = [], fullWord, contextWord, explanation } = exercise || {};

  // step 0 = show last segment only, step N-1 = show all segments (full word)
  const [step, setStep] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const totalSteps = segments.length; // step 0..segments.length-1, then full word is last
  const isFullWord = step === segments.length - 1 && segments.length > 0;

  // Segments shown at current step (right-to-left build: show from the last segment backward)
  // Arabic reads right-to-left so "first" in reading order is the rightmost segment.
  // We reveal right-to-left: at step 0 show only segments[last], at step 1 show segments[last-1..last], etc.
  const visibleCount = step + 1;
  const visibleSegments = segments.slice(segments.length - visibleCount);

  // Current step's "new" segment (the leftmost of visible, i.e., segments[segments.length - visibleCount])
  const currentSegment = segments[segments.length - visibleCount];

  // Build the arabic text for the current visible segments
  const currentArabic = isFullWord && fullWord
    ? fullWord.arabic
    : visibleSegments.map(s => s.arabic).join("");

  async function handleHear() {
    if (audioPlaying) return;
    setAudioPlaying(true);
    try {
      if (isFullWord && fullWord?.ttsText) {
        await playGeneratedArabicAudio(fullWord.ttsText);
      } else if (currentSegment?.letterId != null) {
        await playLetterAudio(currentSegment.letterId, "sound");
      }
    } catch {
      // ignore audio errors
    } finally {
      setAudioPlaying(false);
    }
  }

  function handleNext() {
    sfxTap();
    if (isFullWord) {
      onComplete({ correct: true, targetId: segments[0]?.letterId });
    } else {
      setStep(s => s + 1);
    }
  }

  const hearLabel = isFullWord && fullWord
    ? `Hear: ${fullWord.transliteration}`
    : "Hear this step";

  const nextLabel = isFullWord ? "I can read it \u2192" : "Next \u2192";

  return (
    <div
      className="screen"
      style={{
        background: "var(--c-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-between",
        padding: "24px 20px 32px",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--c-text-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Build up
        </span>
        {/* Step dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginTop: 8,
          }}
        >
          {segments.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i <= step ? "var(--c-primary)" : "var(--c-border)",
                transition: "background 0.25s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Previous steps (dimmed) — shown above current step */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Show previous steps dimmed (all but the newest visible segment) */}
        {visibleSegments.length > 1 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              opacity: 0.35,
            }}
          >
            {visibleSegments.slice(0, -1).map((seg, idx) => (
              <span
                key={idx}
                style={{
                  fontFamily: "var(--font-arabic)",
                  fontSize: 28,
                  lineHeight: 1.6,
                  color: "var(--c-text)",
                  direction: "rtl",
                }}
              >
                {seg.arabic}
              </span>
            ))}
          </div>
        )}

        {/* Current arabic display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            style={{ textAlign: "center" }}
          >
            <span
              style={{
                fontFamily: "var(--font-arabic)",
                fontSize: isFullWord ? 72 : 64,
                lineHeight: 1.6,
                color: "var(--c-primary-dark)",
                direction: "rtl",
                display: "block",
                transition: "font-size 0.2s",
              }}
            >
              {currentArabic}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Sound labels (RTL row of segment sounds) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
          {visibleSegments.map((seg, idx) => {
            const isNew = idx === visibleSegments.length - 1;
            return (
              <span
                key={idx}
                style={{
                  fontSize: 14,
                  fontWeight: isNew ? 700 : 500,
                  color: isNew ? "var(--c-primary)" : "var(--c-text-muted)",
                  background: isNew ? "var(--c-primary-soft)" : "transparent",
                  borderRadius: 8,
                  padding: isNew ? "2px 8px" : "2px 4px",
                  transition: "all 0.2s",
                }}
              >
                {seg.sound}
              </span>
            );
          })}
        </div>

        {/* Transliteration for full word */}
        {isFullWord && fullWord?.transliteration && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--c-text-soft)",
              marginTop: 4,
            }}
          >
            {fullWord.transliteration}
          </motion.div>
        )}

        {/* Explanation card — shown on full word */}
        <AnimatePresence>
          {isFullWord && explanation && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 28 }}
              style={{
                background: "var(--c-bg-card)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
                maxWidth: 340,
                width: "100%",
                marginTop: 8,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "var(--c-text-soft)",
                  lineHeight: 1.6,
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context word card — shown on full word */}
        <AnimatePresence>
          {isFullWord && contextWord && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 28 }}
              style={{
                background: "var(--c-accent-light)",
                border: "1px solid var(--c-border)",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
                maxWidth: 340,
                width: "100%",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-arabic)",
                  fontSize: 32,
                  lineHeight: 1.6,
                  color: "var(--c-primary-dark)",
                  direction: "rtl",
                  display: "block",
                }}
              >
                {contextWord.arabic}
              </span>
              {contextWord.transliteration && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--c-text-soft)",
                    display: "block",
                    marginTop: 2,
                  }}
                >
                  {contextWord.transliteration}
                </span>
              )}
              {contextWord.meaning && (
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--c-text-muted)",
                    display: "block",
                    marginTop: 2,
                  }}
                >
                  {contextWord.meaning}
                </span>
              )}
              {contextWord.surahRef && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--c-accent)",
                    fontWeight: 600,
                    display: "block",
                    marginTop: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {contextWord.surahRef}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingTop: 16,
        }}
      >
        {/* Hear button */}
        <button
          className="hear-btn"
          onClick={handleHear}
          disabled={audioPlaying}
          style={{ opacity: audioPlaying ? 0.6 : 1 }}
        >
          <span className="hear-icon" />
          <span>{hearLabel}</span>
        </button>

        {/* Next / Complete button */}
        <motion.button
          className="btn btn-primary"
          onClick={handleNext}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {nextLabel}
        </motion.button>
      </div>
    </div>
  );
}
