import { useState } from "react";
import { motion } from "framer-motion";
import { sfxCorrect, sfxWrong } from "../../lib/audio.js";

export default function TapInOrder({ exercise, onComplete }) {
  const { letters } = exercise;
  const [tappedCount, setTappedCount] = useState(0);
  const [shakeIndex, setShakeIndex] = useState(null);
  const [done, setDone] = useState(false);

  function handleTap(index) {
    if (done || index < tappedCount) return;

    if (index === tappedCount) {
      sfxCorrect();
      const next = tappedCount + 1;
      setTappedCount(next);

      if (next === letters.length) {
        setDone(true);
        setTimeout(() => {
          onComplete({ correct: true, targetId: letters[0]?.id });
        }, 600);
      }
    } else {
      sfxWrong();
      setShakeIndex(index);
      setTimeout(() => setShakeIndex(null), 500);
    }
  }

  const soundChain = letters.map((l) => l.sound).join("-");

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
        Tap the letters in reading order (right to left)
      </p>

      {/* Letter boxes row — direction rtl so index 0 is on the right */}
      <div
        dir="rtl"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {letters.map((letter, index) => {
          const isTapped = index < tappedCount;
          const isNext = index === tappedCount;

          return (
            <motion.button
              key={letter.id}
              onClick={() => handleTap(index)}
              animate={
                shakeIndex === index
                  ? { x: [-4, 4, -4, 4, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.3 }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                border: isTapped
                  ? "2px solid var(--c-primary)"
                  : isNext
                  ? "2px solid var(--c-accent)"
                  : "2px solid var(--c-border)",
                background: isTapped
                  ? "var(--c-primary)"
                  : "var(--c-bg-card)",
                color: isTapped
                  ? "#fff"
                  : shakeIndex === index
                  ? "var(--c-danger)"
                  : "var(--c-text)",
                fontFamily: "var(--font-arabic)",
                fontSize: 26,
                cursor: done ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isNext && !done
                  ? "0 0 0 3px rgba(196,164,100,0.3)"
                  : "none",
                transition: "background 0.2s, color 0.2s, border-color 0.2s",
              }}
            >
              {letter.arabic}
            </motion.button>
          );
        })}
      </div>

      {/* Progress indicators */}
      <div
        dir="rtl"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {letters.map((letter, index) => {
          const isTapped = index < tappedCount;
          return (
            <div
              key={letter.id}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                background: isTapped
                  ? "var(--c-primary-soft)"
                  : "var(--c-border)",
                color: isTapped ? "var(--c-primary)" : "var(--c-text-muted)",
                fontSize: 12,
                fontWeight: isTapped ? 600 : 400,
                transition: "background 0.2s, color 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {isTapped ? `${letter.sound} ✓` : "?"}
            </div>
          );
        })}
      </div>

      {/* Success message */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "var(--c-primary-soft)",
            borderRadius: 12,
            padding: "12px 20px",
            color: "var(--c-primary)",
            fontWeight: 600,
            fontSize: 15,
            textAlign: "center",
          }}
        >
          ✓ You read that right to left: {soundChain}
        </motion.div>
      )}
    </div>
  );
}
