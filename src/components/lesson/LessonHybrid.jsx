import { useState, useCallback } from "react";
import { Icons } from "../Icons.jsx";
import { motion, AnimatePresence } from "framer-motion";
import useLessonHybrid from "./useLessonHybrid.js";
import GuidedReveal from "./GuidedReveal.jsx";
import BuildUpReader from "./BuildUpReader.jsx";
import FreeReader from "./FreeReader.jsx";
import TapInOrder from "./TapInOrder.jsx";
import SpotTheBreak from "./SpotTheBreak.jsx";
import LessonSummary from "./LessonSummary.jsx";
import { getLetter } from "../../data/letters.js";
import { sfxCorrect, sfxWrong } from "../../lib/audio.js";

const STAGE_LABELS = {
  guided: "Learning",
  buildup: "Building",
  free: "Reading",
};

const STAGE_STYLES = {
  guided: {
    color: "var(--c-primary)",
    background: "var(--c-primary-soft)",
  },
  buildup: {
    color: "var(--c-accent)",
    background: "var(--c-accent-light)",
  },
  free: {
    color: "var(--c-text-muted)",
    background: "var(--c-bg)",
  },
};

function StageIndicator({ stage }) {
  const label = STAGE_LABELS[stage] ?? "Learning";
  const styles = STAGE_STYLES[stage] ?? STAGE_STYLES.guided;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 10px",
        borderRadius: 20,
        color: styles.color,
        background: styles.background,
        marginBottom: 12,
      }}
    >
      {label}
    </span>
  );
}

function ComprehensionExercise({ exercise, onComplete }) {
  const [selectedId, setSelectedId] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const { prompt, displayArabic, options = [], targetId } = exercise;

  // Detect if options contain Arabic text (unicode range check or optionMode)
  const hasArabicOptions = options.some(o => o.label && /[\u0600-\u06FF\uFE70-\uFEFF]/.test(o.label));
  const optCount = options.length;
  const isCompact = optCount <= 2;
  const isTriple = optCount === 3;
  const gridStyle = isCompact
    ? { display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 340 }
    : isTriple
      ? { display: "flex", flexWrap: "wrap", gap: 14, width: "100%", maxWidth: 340, justifyContent: "center" }
      : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, width: "100%", maxWidth: 340 };
  const optMinHeight = hasArabicOptions ? 90 : 60;

  const handleSelect = useCallback((option) => {
    if (answered) return;
    const correct = option.isCorrect === true;
    setSelectedId(option.id);
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) {
      sfxCorrect();
      setTimeout(() => onComplete({ correct: true, selectedOption: option }), 850);
    } else {
      sfxWrong();
      // Don't auto-advance — wait for "Got it" button
    }
  }, [answered, onComplete]);

  const handleGotIt = useCallback(() => {
    const option = options.find(o => o.id === selectedId);
    onComplete({ correct: false, selectedOption: option });
  }, [options, selectedId, onComplete]);

  // Build wrong-answer explanation for letter identification questions
  const wrongExplanation = (() => {
    if (!answered || isCorrect) return null;
    if (typeof selectedId !== "number" || typeof targetId !== "number") return null;
    const chosenLetter = getLetter(selectedId);
    const correctLetter = getLetter(targetId);
    if (!chosenLetter || !correctLetter) return null;
    const chosenPart = chosenLetter.visualRule
      ? `${chosenLetter.name} — ${chosenLetter.visualRule}`
      : chosenLetter.name;
    const correctPart = correctLetter.visualRule
      ? `${correctLetter.name} — ${correctLetter.visualRule}`
      : correctLetter.name;
    return `That's ${chosenPart}. The correct answer is ${correctPart}.`;
  })();

  const chosenLetter = answered && !isCorrect && typeof selectedId === "number" ? getLetter(selectedId) : null;
  const correctLetter = answered && !isCorrect && typeof targetId === "number" ? getLetter(targetId) : null;
  const showVisualCompare = chosenLetter && correctLetter && chosenLetter.id !== correctLetter.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 16 }}>
      {displayArabic && (
        <div
          className="arabic-letter"
          dir="rtl"
          style={{ fontSize: 56, lineHeight: 1.4, marginBottom: 4, textAlign: "center" }}
        >
          {displayArabic}
        </div>
      )}
      <p style={{ fontSize: 17, fontWeight: 600, color: "var(--c-text)", textAlign: "center", marginBottom: 8 }}>
        {prompt}
      </p>
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden"
        animate="show"
        style={gridStyle}
      >
        {options.map((option) => {
          let cls = "quiz-option";
          if (answered) {
            if (option.id === selectedId && isCorrect) cls += " correct";
            else if (option.id === selectedId && !isCorrect) cls += " wrong";
            else if (option.isCorrect && !isCorrect) cls += " revealed-correct";
            else cls += " disabled";
          }
          const isSelectedCorrect = answered && option.id === selectedId && isCorrect;
          const isSelectedWrong = answered && option.id === selectedId && !isCorrect;
          const isOptionArabic = option.label && /[\u0600-\u06FF\uFE70-\uFEFF]/.test(option.label);
          return (
            <motion.button
              key={option.id}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
              }}
              whileHover={!answered ? { scale: 1.02, borderColor: "var(--c-primary)", transition: { type: "spring", stiffness: 400, damping: 30 } } : undefined}
              whileTap={!answered ? { scale: 0.94 } : undefined}
              {...(isSelectedCorrect ? {
                animate: { backgroundColor: ["#FFFFFF", "#E8F0EB", "#E8F0EB"], scale: [1, 1.04, 1] },
                transition: { duration: 0.4, times: [0, 0.3, 1] },
              } : isSelectedWrong ? {
                animate: { x: [-6, 6, -5, 5, -3, 3, 0] },
                transition: { duration: 0.4, ease: "easeOut" },
              } : {
                transition: { type: "spring", stiffness: 400, damping: 25 },
              })}
              className={cls}
              onClick={() => handleSelect(option)}
              disabled={answered}
              style={{ textAlign: "center", position: "relative", minHeight: optMinHeight, padding: isOptionArabic ? "20px 12px" : "18px 12px", ...(isTriple ? { width: "calc(50% - 7px)", flexShrink: 0 } : {}) }}
            >
              <span style={{
                fontFamily: isOptionArabic ? "var(--font-arabic)" : "var(--font-body)",
                fontSize: isOptionArabic ? 48 : 17,
                fontWeight: isOptionArabic ? 400 : 700,
                lineHeight: isOptionArabic ? 1.5 : 1,
                color: (answered && option.isCorrect) ? "var(--c-primary-dark)" : (answered && option.id === selectedId && !isCorrect) ? "var(--c-danger)" : "var(--c-text)",
              }}>{option.label}</span>
              <AnimatePresence>
                {isSelectedCorrect && (
                  <motion.span
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -56, scale: 1.3 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: [0.2, 0.8, 0.4, 1] }}
                    style={{
                      position: "absolute", top: -8, left: "50%", marginLeft: -10,
                      color: "gold", fontWeight: 700, fontSize: 18, pointerEvents: "none",
                    }}
                  >
                    +1
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {answered && !isCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "var(--c-danger-light)",
              borderRadius: 20,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icons.X size={18} color="var(--c-danger)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#7a2e2b", lineHeight: 1.5 }}>
                {wrongExplanation || "Not quite — the correct answer is highlighted above."}
              </span>
            </div>
            {showVisualCompare && (
              <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "8px 0 4px" }}>
                <div style={{ textAlign: "center", opacity: 0.5 }}>
                  <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-danger)", display: "block", lineHeight: 1.4 }}>{chosenLetter.letter}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7a2e2b" }}>{chosenLetter.name}</span>
                  {chosenLetter.visualRule && <span style={{ fontSize: 9, color: "#7a2e2b", display: "block", opacity: 0.7 }}>{chosenLetter.visualRule}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", fontSize: 14, color: "var(--c-text-muted)" }}>{"→"}</div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-primary)", display: "block", lineHeight: 1.4 }}>{correctLetter.letter}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-primary)" }}>{correctLetter.name}</span>
                  {correctLetter.visualRule && <span style={{ fontSize: 9, color: "var(--c-primary)", display: "block", opacity: 0.8 }}>{correctLetter.visualRule}</span>}
                </div>
              </div>
            )}
            <button className="btn btn-primary" onClick={handleGotIt} style={{ fontSize: 14, marginTop: 2 }}>Got It</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LessonHybrid({
  lesson,
  exercises,
  progress,
  completedLessonIds,
  lessonsCompleted,
  onComplete,
  onRetry,
  onBack,
}) {
  const hybrid = useLessonHybrid({ lesson, exercises, onComplete });

  if (hybrid.phase === "summary") {
    return (
      <LessonSummary
        lesson={lesson}
        lessonId={lesson.id}
        teachLetters={[]}
        lessonCombos={[]}
        quizResults={hybrid.results}
        speakResults={[]}
        lessonsCompleted={lessonsCompleted}
        isHarakatIntro={false}
        isHarakatApplied={false}
        onComplete={onComplete}
        onRetry={onRetry}
        onBack={onBack}
        speakingEnabled={false}
      />
    );
  }

  const { currentExercise, currentStage, exIndex, totalExercises, progress: progressPct } = hybrid;

  function handleExerciseComplete(result) {
    hybrid.recordResult(result);
    const isGuided = currentStage === "guided";
    const isBuildup = currentStage === "buildup";
    const isComprehension = currentExercise?.type === "comprehension";
    if (isComprehension) {
      // ComprehensionExercise manages its own timing (850ms auto-advance on correct,
      // "Got it" button on wrong) — advance immediately when onComplete fires
      hybrid.advance();
    } else if (isGuided || isBuildup) {
      setTimeout(() => hybrid.advance(), 300);
    } else {
      hybrid.advance();
    }
  }

  function renderExercise() {
    if (!currentExercise) return null;
    const { type } = currentExercise;

    if (type === "guided_reveal" || type === "form_intro" || type === "letter_in_context") {
      return <GuidedReveal exercise={currentExercise} onComplete={handleExerciseComplete} />;
    }
    if (type === "tap_in_order") {
      return <TapInOrder exercise={currentExercise} onComplete={handleExerciseComplete} />;
    }
    if (type === "buildup" || type === "buildup_pair" || type === "buildup_word") {
      return <BuildUpReader exercise={currentExercise} onComplete={handleExerciseComplete} />;
    }
    if (type === "free_read") {
      return <FreeReader exercise={currentExercise} onComplete={handleExerciseComplete} />;
    }
    if (type === "spot_the_break") {
      return <SpotTheBreak exercise={currentExercise} onComplete={handleExerciseComplete} />;
    }
    if (type === "comprehension") {
      return <ComprehensionExercise exercise={currentExercise} onComplete={handleExerciseComplete} />;
    }
    // Fallback for unknown types
    return (
      <div style={{ textAlign: "center", color: "var(--c-text-soft)", fontSize: 14 }}>
        Unknown exercise type: {type}
      </div>
    );
  }

  return (
    <div className="screen" style={{ background: "var(--c-bg)", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button
            onClick={onBack}
            aria-label="Close lesson"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
          >
            <Icons.X size={22} color="var(--c-text-soft)" />
          </button>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ flex: 1 }}
          >
            <motion.div
              className="progress-fill"
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text-soft)", minWidth: 40, textAlign: "right" }}>
            {exIndex + 1}/{totalExercises}
          </span>
        </div>
        <div style={{ textAlign: "center" }}>
          <StageIndicator stage={currentStage} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 4px" }}>
        <motion.div
          key={exIndex}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
        >
          {renderExercise()}
        </motion.div>
      </div>
    </div>
  );
}
