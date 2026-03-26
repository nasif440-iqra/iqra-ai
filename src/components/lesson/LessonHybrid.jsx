import { useState } from "react";
import { Icons } from "../Icons.jsx";
import { motion } from "framer-motion";
import useLessonHybrid from "./useLessonHybrid.js";
import GuidedReveal from "./GuidedReveal.jsx";
import BuildUpReader from "./BuildUpReader.jsx";
import FreeReader from "./FreeReader.jsx";
import TapInOrder from "./TapInOrder.jsx";
import SpotTheBreak from "./SpotTheBreak.jsx";
import LessonSummary from "./LessonSummary.jsx";

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
  const [selected, setSelected] = useState(null);
  const { prompt, arabicDisplay, options = [] } = exercise;

  function handleSelect(option) {
    if (selected !== null) return;
    setSelected(option);
    const correct = option.correct === true;
    onComplete({ correct, selectedOption: option });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 16 }}>
      {arabicDisplay && (
        <div
          className="arabic-letter"
          dir="rtl"
          style={{ fontSize: 56, lineHeight: 1.4, marginBottom: 4, textAlign: "center" }}
        >
          {arabicDisplay}
        </div>
      )}
      <p style={{ fontSize: 17, fontWeight: 600, color: "var(--c-text)", textAlign: "center", marginBottom: 8 }}>
        {prompt}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        {options.map((option, i) => {
          const isSelected = selected === option;
          const isAnswered = selected !== null;
          let optionStyle = {};
          if (isAnswered) {
            if (option.correct) {
              optionStyle = {
                background: "var(--c-primary-soft)",
                borderColor: "var(--c-primary)",
                color: "var(--c-primary)",
              };
            } else if (isSelected && !option.correct) {
              optionStyle = {
                background: "var(--c-danger-light)",
                borderColor: "var(--c-danger)",
                color: "var(--c-danger)",
              };
            }
          }
          return (
            <button
              key={i}
              className="quiz-option"
              onClick={() => handleSelect(option)}
              disabled={isAnswered}
              style={{
                width: "100%",
                textAlign: "center",
                ...optionStyle,
              }}
            >
              {option.text}
            </button>
          );
        })}
      </div>
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
    if (isGuided || isBuildup) {
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
