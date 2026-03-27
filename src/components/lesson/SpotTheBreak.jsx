import { useState } from "react";
import { motion } from "framer-motion";
import { sfxCorrect, sfxWrong } from "../../lib/audio.js";
import { getLetter } from "../../data/letters.js";

export default function SpotTheBreak({ exercise, onComplete }) {
  const { word, segments, breakerLetterId, explanation } = exercise;

  const [selected, setSelected] = useState(null); // index of tapped segment
  const [shakeIndex, setShakeIndex] = useState(null);
  const [done, setDone] = useState(false);

  const breakerLetter = getLetter(breakerLetterId);
  const breakerName = breakerLetter?.name ?? "";

  // Find the correct segment index (the one with isBreakAfter: true)
  const correctIndex = segments.findIndex((s) => s.isBreakAfter);

  function handleTap(index) {
    if (done || selected !== null) return;

    setSelected(index);

    if (index === correctIndex) {
      sfxCorrect();
      setDone(true);
      setTimeout(() => {
        onComplete({ correct: true, targetId: breakerLetterId });
      }, 1200);
    } else {
      sfxWrong();
      setShakeIndex(index);
      setTimeout(() => setShakeIndex(null), 500);
    }
  }

  function handleGotIt() {
    onComplete({ correct: false, targetId: breakerLetterId });
  }

  const isAnswered = selected !== null;
  const isCorrect = selected === correctIndex;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        padding: "24px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: 14,
          color: "var(--c-text-soft)",
          margin: 0,
          textAlign: "center",
        }}
      >
        Tap where the word breaks (where a letter doesn&apos;t connect forward)
      </p>

      {/* Full word display */}
      <div
        style={{
          fontSize: 48,
          fontFamily: "var(--font-arabic)",
          color: "var(--c-text)",
          lineHeight: 1.3,
        }}
        dir="rtl"
      >
        {word.arabic}
      </div>

      <p
        style={{
          fontSize: 13,
          color: "var(--c-text-muted)",
          margin: 0,
          fontStyle: "italic",
        }}
      >
        {word.transliteration}
      </p>

      {/* Segment buttons in RTL direction */}
      <div
        dir="rtl"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {segments.map((segment, index) => {
          const isTapped = selected === index;
          const isCorrectSegment = index === correctIndex;

          let borderColor = "var(--c-border)";
          let background = "var(--c-bg-card)";

          if (isTapped && isCorrect) {
            borderColor = "var(--c-primary)";
            background = "var(--c-primary-soft)";
          } else if (isTapped && !isCorrect) {
            borderColor = "var(--c-danger)";
            background = "var(--c-danger-light)";
          } else if (isAnswered && isCorrectSegment) {
            // Reveal correct after wrong answer
            borderColor = "var(--c-primary)";
            background = "var(--c-primary-soft)";
          }

          return (
            <motion.button
              key={index}
              onClick={() => handleTap(index)}
              animate={
                shakeIndex === index
                  ? { x: [-4, 4, -4, 4, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.3 }}
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                border: `2px solid ${borderColor}`,
                background,
                fontFamily: "var(--font-arabic)",
                fontSize: 28,
                color: "var(--c-text)",
                cursor: isAnswered ? "default" : "pointer",
                transition: "background 0.2s, border-color 0.2s",
                lineHeight: 1.4,
              }}
              dir="rtl"
            >
              {segment.arabic}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback panel */}
      {isAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: isCorrect ? "var(--c-primary-soft)" : "var(--c-danger-light)",
            borderRadius: 12,
            padding: "14px 18px",
            color: isCorrect ? "var(--c-primary)" : "var(--c-danger)",
            fontSize: 14,
            textAlign: "center",
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
          }}
        >
          {breakerName && (
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
              {isCorrect ? "Correct!" : "Not quite."} The breaker is{" "}
              <span style={{ fontFamily: "var(--font-arabic)" }}>
                {breakerLetter?.letter}
              </span>{" "}
              ({breakerName})
            </p>
          )}
          <p style={{ margin: 0, lineHeight: 1.5 }}>{explanation}</p>

          {!isCorrect && (
            <button
              onClick={handleGotIt}
              style={{
                marginTop: 4,
                padding: "8px 20px",
                borderRadius: "var(--radius-btn)",
                border: "none",
                background: "var(--c-danger)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
