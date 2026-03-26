import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getLetter } from "../../data/letters.js";
import { getConnectedForms } from "../../data/connectedForms.js";
import { playLetterAudio } from "../../lib/audio.js";
import { Icons } from "../Icons.jsx";

const POSITION_LABELS = {
  isolated: "Alone",
  initial: "Start",
  medial: "Middle",
  final: "End",
};

const ALL_POSITIONS = ["isolated", "initial", "medial", "final"];

/**
 * GuidedReveal — progressively reveals connected letter forms with
 * animations, explanations, and audio.
 *
 * @param {{ exercise: object, onComplete: function }} props
 */
export default function GuidedReveal({ exercise, onComplete }) {
  const { letterId, revealUpTo, explanation, contextWord } = exercise;

  const letter = getLetter(letterId);
  const connectedData = getConnectedForms(letterId);

  // Determine which positions to show (non-connectors only get isolated + final)
  const joins = connectedData ? connectedData.joins : false;
  const positions = joins ? ALL_POSITIONS : ["isolated", "final"];

  // Find the index of the revealUpTo position within our positions list
  const revealUpToIndex = positions.indexOf(revealUpTo);
  const maxRevealIndex = revealUpToIndex >= 0 ? revealUpToIndex : positions.length - 1;

  // Start by showing just the first position
  const [revealedIndex, setRevealedIndex] = useState(0);

  const isFullyRevealed = revealedIndex >= maxRevealIndex;
  const showContextWord = isFullyRevealed && contextWord;

  function handleNext() {
    if (!isFullyRevealed) {
      setRevealedIndex(i => i + 1);
    } else {
      onComplete({ correct: true, targetId: letterId });
    }
  }

  const forms = connectedData ? connectedData.forms : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        padding: "0 16px",
        gap: 20,
      }}
    >
      {/* Letter name + audio button */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {letter && (
          <span
            style={{
              fontFamily: "var(--font-arabic)",
              fontSize: 52,
              lineHeight: 1.2,
              color: "var(--c-primary-dark)",
            }}
            dir="rtl"
          >
            {letter.letter}
          </span>
        )}
        <button
          className="hear-btn"
          onClick={() => playLetterAudio(letterId, "name")}
          style={{ marginTop: 2 }}
        >
          <Icons.Volume size={16} color="var(--c-primary)" />
          <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 600, color: "var(--c-primary)" }}>
            Hear {letter ? letter.name : "letter"}
          </span>
        </button>
      </div>

      {/* Position chips row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        {positions.map((pos, idx) => {
          const isRevealed = idx <= revealedIndex;
          const isCurrent = idx === revealedIndex;
          const isUnrevealed = idx > revealedIndex;
          const glyph = forms ? forms[pos] : null;

          return (
            <motion.div
              key={pos}
              initial={false}
              animate={
                isCurrent
                  ? { scale: 1.05, opacity: 1 }
                  : isRevealed
                  ? { scale: 1, opacity: 1 }
                  : { scale: 0.95, opacity: 0.45 }
              }
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "12px 14px",
                borderRadius: 16,
                minWidth: 64,
                border: isCurrent
                  ? "2px solid var(--c-primary)"
                  : isRevealed
                  ? "2px solid var(--c-primary)"
                  : "2px dashed var(--c-border)",
                background: isCurrent
                  ? "var(--c-primary)"
                  : isRevealed
                  ? "var(--c-bg-card)"
                  : "transparent",
                boxShadow: isCurrent
                  ? "0 4px 12px rgba(22,51,35,0.18)"
                  : isRevealed
                  ? "var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.06))"
                  : "none",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              <AnimatePresence mode="wait">
                {isRevealed && glyph ? (
                  <motion.span
                    key={`glyph-${pos}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{
                      fontFamily: "var(--font-arabic)",
                      fontSize: 30,
                      lineHeight: 1.3,
                      color: isCurrent ? "#fff" : "var(--c-primary-dark)",
                    }}
                    dir="rtl"
                  >
                    {glyph}
                  </motion.span>
                ) : isUnrevealed ? (
                  <motion.span
                    key={`placeholder-${pos}`}
                    style={{
                      fontSize: 24,
                      lineHeight: 1.3,
                      color: "var(--c-border)",
                      fontWeight: 700,
                    }}
                  >
                    {"?"}
                  </motion.span>
                ) : null}
              </AnimatePresence>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: isCurrent
                    ? "rgba(255,255,255,0.85)"
                    : isRevealed
                    ? "var(--c-text-muted)"
                    : "var(--c-border)",
                }}
              >
                {POSITION_LABELS[pos]}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Explanation card */}
      {explanation && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          style={{
            background: "var(--c-primary-soft)",
            border: "1px solid var(--c-primary)",
            borderRadius: 16,
            padding: "14px 18px",
            width: "100%",
          }}
        >
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--c-primary-dark)",
              margin: 0,
              textAlign: "center",
            }}
          >
            {explanation}
          </p>
        </motion.div>
      )}

      {/* Context word card — shown when fully revealed */}
      <AnimatePresence>
        {showContextWord && (
          <motion.div
            key="context-word"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            style={{
              background: "var(--c-bg-card)",
              border: "1px solid var(--c-border)",
              borderRadius: 20,
              padding: "18px 20px",
              width: "100%",
              boxShadow: "var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.06))",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--c-accent)",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              {contextWord.surahRef || "Example word"}
            </p>
            <span
              style={{
                fontFamily: "var(--font-arabic)",
                fontSize: 42,
                lineHeight: 1.4,
                color: "var(--c-primary-dark)",
                display: "block",
                marginBottom: 6,
              }}
              dir="rtl"
            >
              {contextWord.arabic}
            </span>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--c-primary)",
                marginBottom: 2,
              }}
            >
              {contextWord.transliteration}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--c-text-soft)",
                margin: 0,
              }}
            >
              {contextWord.meaning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next / Continue button */}
      <button
        className="btn btn-primary"
        onClick={handleNext}
        style={{ width: "100%", marginTop: 4 }}
      >
        {isFullyRevealed ? "Continue" : "Next Form \u2192"}
      </button>
    </div>
  );
}
