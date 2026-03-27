import { useState } from "react";
import { motion } from "framer-motion";
import { playGeneratedArabicAudio } from "../../lib/tts.js";

// States for the free-read self-assessment flow
const STATE_INITIAL = "initial";      // Show instructions + "Hear the correct reading" button
const STATE_HEARD = "heard";          // Heard audio once — show self-assessment buttons
const STATE_RETRY = "retry";          // User wants to hear again — show "Hear again" + "Got it now"

export default function FreeReader({ exercise, onComplete }) {
  const [flowState, setFlowState] = useState(STATE_INITIAL);
  const [isLoading, setIsLoading] = useState(false);

  async function playAudio() {
    setIsLoading(true);
    try {
      await playGeneratedArabicAudio(exercise.ttsText);
    } catch {
      // Audio failure is non-blocking
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePlayAudio() {
    await playAudio();
    if (flowState === STATE_INITIAL) {
      setFlowState(STATE_HEARD);
    }
  }

  function handleReadItRight() {
    onComplete({ correct: true, targetId: exercise.targetId, selfAssessed: true });
  }

  function handleGotItNow() {
    onComplete({ correct: true, targetId: exercise.targetId, selfAssessed: true, selfAssessedRetry: true });
  }

  function handleHearItAgain() {
    setFlowState(STATE_RETRY);
    playAudio();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "24px 20px 32px",
        gap: 0,
      }}
    >
      {/* Arabic word */}
      <motion.div
        key="arabic-word"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        style={{
          fontFamily: "var(--font-arabic)",
          fontSize: 56,
          lineHeight: 1.5,
          color: "var(--c-primary-dark)",
          textAlign: "center",
          marginBottom: exercise.contextWord ? 12 : 24,
          userSelect: "none",
        }}
        dir="rtl"
      >
        {exercise.arabic}
      </motion.div>

      {/* Context word badge */}
      {exercise.contextWord && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--c-accent-light)",
            border: "1px solid var(--c-border)",
            borderRadius: 20,
            padding: "5px 14px",
            marginBottom: 24,
          }}
        >
          {exercise.contextWord.transliteration && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-accent)" }}>
              {exercise.contextWord.transliteration}
            </span>
          )}
          {exercise.contextWord.transliteration && exercise.contextWord.meaning && (
            <span style={{ fontSize: 13, color: "var(--c-text-muted)" }}>&mdash;</span>
          )}
          {exercise.contextWord.meaning && (
            <span style={{ fontSize: 13, color: "var(--c-text-soft)" }}>
              {exercise.contextWord.meaning}
            </span>
          )}
          {exercise.contextWord.surahRef && (
            <span style={{ fontSize: 11, color: "var(--c-text-muted)", marginLeft: 2 }}>
              ({exercise.contextWord.surahRef})
            </span>
          )}
        </motion.div>
      )}

      {/* Instructions */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{
          fontSize: 14,
          color: "var(--c-text-soft)",
          textAlign: "center",
          maxWidth: 300,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        Read the word in your head or out loud. Then tap below to hear how it sounds.
      </motion.p>

      {/* Flow: initial state — single "Hear the correct reading" button */}
      {flowState === STATE_INITIAL && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3 }}
          onClick={handlePlayAudio}
          disabled={isLoading}
          aria-label="Hear the correct reading"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--c-primary)",
            color: "var(--c-bg-card)",
            border: "none",
            borderRadius: "var(--radius-btn)",
            padding: "14px 28px",
            fontSize: 15,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
            fontFamily: "var(--font-body)",
            width: "100%",
            maxWidth: 340,
            justifyContent: "center",
            transition: "opacity 0.15s",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>&#128266;</span>
          <span>{isLoading ? "Loading..." : "Hear the correct reading"}</span>
        </motion.button>
      )}

      {/* Flow: heard state — self-assessment buttons */}
      {flowState === STATE_HEARD && (
        <motion.div
          key="heard-actions"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 340 }}
        >
          {/* "I read it right" — positive self-assessment */}
          <button
            onClick={handleReadItRight}
            aria-label="I read it right"
            style={{
              background: "var(--c-primary-soft)",
              color: "var(--c-primary)",
              border: "2px solid var(--c-primary)",
              borderRadius: "var(--radius-btn)",
              padding: "14px 24px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              width: "100%",
              textAlign: "center",
              transition: "background 0.15s",
            }}
          >
            <span aria-hidden="true">&#10003;</span> I read it right
          </button>

          {/* "Hear it again" — neutral */}
          <button
            onClick={handleHearItAgain}
            disabled={isLoading}
            aria-label="Hear it again"
            style={{
              background: "var(--c-bg-card)",
              color: "var(--c-text-soft)",
              border: "1.5px solid var(--c-border)",
              borderRadius: "var(--radius-btn)",
              padding: "13px 24px",
              fontSize: 15,
              fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              fontFamily: "var(--font-body)",
              width: "100%",
              textAlign: "center",
              transition: "opacity 0.15s",
            }}
          >
            {isLoading ? "Loading..." : "Hear it again"}
          </button>
        </motion.div>
      )}

      {/* Flow: retry state — "Hear again" + "Got it now" */}
      {flowState === STATE_RETRY && (
        <motion.div
          key="retry-actions"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 340 }}
        >
          {/* Encouraging nudge */}
          <p style={{
            fontSize: 13,
            color: "var(--c-text-muted)",
            textAlign: "center",
            marginBottom: 4,
            lineHeight: 1.5,
          }}>
            Listen carefully and try again.
          </p>

          {/* "Hear again" — neutral */}
          <button
            onClick={playAudio}
            disabled={isLoading}
            aria-label="Hear again"
            style={{
              background: "var(--c-bg-card)",
              color: "var(--c-text-soft)",
              border: "1.5px solid var(--c-border)",
              borderRadius: "var(--radius-btn)",
              padding: "13px 24px",
              fontSize: 15,
              fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              fontFamily: "var(--font-body)",
              width: "100%",
              textAlign: "center",
              transition: "opacity 0.15s",
            }}
          >
            {isLoading ? "Loading..." : <><span aria-hidden="true">&#128266;</span> Hear again</>}
          </button>

          {/* "Got it now" — positive */}
          <button
            onClick={handleGotItNow}
            aria-label="Got it now"
            style={{
              background: "var(--c-primary-soft)",
              color: "var(--c-primary)",
              border: "2px solid var(--c-primary)",
              borderRadius: "var(--radius-btn)",
              padding: "14px 24px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              width: "100%",
              textAlign: "center",
              transition: "background 0.15s",
            }}
          >
            <span aria-hidden="true">&#10003;</span> Got it now
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
