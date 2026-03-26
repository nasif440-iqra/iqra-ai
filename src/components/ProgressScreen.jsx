import { useState } from "react";
import { ARABIC_LETTERS, getLetter } from "../data/letters.js";
import { LESSONS } from "../data/lessons.js";
import { Icons } from "./Icons.jsx";
import { sfxTap } from "../lib/audio.js";
import { resetProgress, exportProgressJSON, importProgressJSON } from "../lib/progress.js";
import { getCurrentLesson, getLearnedLetterIds } from "../lib/selectors.js";
import { LetterDetailModal } from "./PronunciationGuide.jsx";

/* ── Phase grouping definitions ──────────────────────────────────────────── */
const PHASE_GROUPS = [
  {
    key: "recognition",
    title: "Letter Recognition",
    subtitle: "Learn to identify each Arabic letter by shape",
    filter: (l) => l.phase === 1,
  },
  {
    key: "sounds",
    title: "Letter Sounds",
    subtitle: "Connect each letter to how it sounds",
    filter: (l) => l.phase === 2 && (l.lessonMode === "sound" || (l.lessonMode === "checkpoint" && l.id === 85)),
  },
  {
    key: "contrast",
    title: "Sound Contrast",
    subtitle: "Distinguish similar-sounding letters",
    filter: (l) => l.phase === 2 && (l.lessonMode === "contrast" || (l.lessonMode === "checkpoint" && l.id === 65)),
  },
  {
    key: "harakat-intro",
    title: "Harakat Introduction",
    subtitle: "Meet the three short vowel marks",
    filter: (l) => l.phase === 3 && l.lessonMode === "harakat-intro",
  },
  {
    key: "harakat",
    title: "Harakat Practice",
    subtitle: "Read letters with all three vowels",
    filter: (l) =>
      l.phase === 3 &&
      (l.lessonMode === "harakat" || l.lessonMode === "harakat-mixed"),
  },
];

export default function ProgressScreen({
  progress,
  completedLessonIds,
  onStartLesson,
}) {
  const learnedIds = getLearnedLetterIds(completedLessonIds);
  const currentLesson = getCurrentLesson(completedLessonIds);
  const [selectedLetterId, setSelectedLetterId] = useState(null);
  const selectedLetter = selectedLetterId ? getLetter(selectedLetterId) : null;

  // Build phase data
  const phases = PHASE_GROUPS.map((group) => {
    const lessons = LESSONS.filter(group.filter);
    const doneCount = lessons.filter((l) =>
      completedLessonIds.includes(l.id)
    ).length;
    const total = lessons.length;
    const containsCurrent = lessons.some((l) => l.id === currentLesson.id);
    const allDone = doneCount === total && total > 0;
    // A phase is locked if it has lessons, none are completed, and the current lesson is not inside it
    const firstLesson = lessons[0];
    const isLocked =
      total > 0 &&
      doneCount === 0 &&
      !containsCurrent &&
      firstLesson &&
      firstLesson.id > currentLesson.id;
    const status = allDone ? "complete" : containsCurrent || doneCount > 0 ? "in-progress" : isLocked ? "locked" : "in-progress";
    return { ...group, lessons, doneCount, total, containsCurrent, status };
  });

  // All phases start closed — user taps to expand
  const [openPhases, setOpenPhases] = useState(() => new Set());

  const toggle = (key) => {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Stats
  const totalCorrect = Object.values(progress).reduce(
    (s, p) => s + p.correct,
    0
  );
  const totalAttempts = Object.values(progress).reduce(
    (s, p) => s + p.attempts,
    0
  );
  const accuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const totalLessons = LESSONS.length;
  const totalDone = completedLessonIds.length;

  return (
    <div className="screen pattern-bg" style={{ paddingBottom: 100 }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ── */}
        <h1
          className="fade-up"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 26,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          Your Progress
        </h1>

        {/* ── Stats row ── */}
        <div
          className="fade-up"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 8,
            marginBottom: 28,
            animationDelay: "0.1s",
          }}
        >
          {[
            { label: "Letters", value: learnedIds.length },
            { label: "Lessons", value: `${totalDone}/${totalLessons}` },
            {
              label: "Accuracy",
              value: totalAttempts > 0 ? `${accuracy}%` : "\u2014",
            },
            {
              label: "Phase",
              value:
                currentLesson.phase === 3
                  ? "3"
                  : currentLesson.phase === 2
                  ? "2"
                  : "1",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="card"
              style={{ textAlign: "center", padding: "14px 6px" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--c-primary)",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--c-text-muted)",
                  marginTop: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Phase containers ── */}
        <h3
          className="fade-up"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 14,
            animationDelay: "0.15s",
          }}
        >
          Your Journey
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}
        >
          {phases.map((phase, pi) => {
            const isOpen = openPhases.has(phase.key);
            const isLocked = phase.status === "locked";

            return (
              <div
                key={phase.key}
                className="phase-card fade-up"
                style={{
                  animationDelay: `${0.18 + pi * 0.05}s`,
                  opacity: isLocked ? 0.55 : 1,
                }}
              >
                {/* ── Phase header ── */}
                <div
                  className="phase-card-header"
                  onClick={() => !isLocked && toggle(phase.key)}
                  style={{ cursor: isLocked ? "default" : "pointer" }}
                >
                  {/* Status indicator */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        phase.status === "complete"
                          ? "var(--c-primary)"
                          : phase.status === "in-progress"
                          ? "var(--c-primary-soft)"
                          : "var(--c-bg)",
                      border:
                        phase.status === "complete"
                          ? "none"
                          : phase.status === "in-progress"
                          ? "2px solid var(--c-primary)"
                          : "2px solid var(--c-border)",
                    }}
                  >
                    {phase.status === "complete" ? (
                      <Icons.Check size={16} color="var(--c-accent)" />
                    ) : phase.status === "in-progress" ? (
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--c-primary)",
                        }}
                      >
                        {phase.doneCount}
                      </span>
                    ) : (
                      <Icons.Lock size={14} color="var(--c-text-muted)" />
                    )}
                  </div>

                  {/* Title + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: 15,
                        fontWeight: 600,
                        color: isLocked
                          ? "var(--c-text-muted)"
                          : "var(--c-text)",
                        lineHeight: 1.3,
                      }}
                    >
                      {phase.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--c-text-muted)",
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {phase.subtitle}
                    </div>
                  </div>

                  {/* Progress count + chevron */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          phase.status === "complete"
                            ? "var(--c-primary)"
                            : "var(--c-text-muted)",
                      }}
                    >
                      {phase.doneCount}/{phase.total}
                    </span>
                    {!isLocked && (
                      <Icons.Chevron
                        size={16}
                        color="var(--c-text-muted)"
                        direction={isOpen ? "up" : "down"}
                      />
                    )}
                  </div>
                </div>

                {/* ── Progress bar ── */}
                {phase.total > 0 && (
                  <div
                    style={{
                      padding: "0 18px",
                      paddingBottom: isOpen ? 0 : 14,
                    }}
                  >
                    <div
                      className="progress-track"
                      style={{ height: 4, borderRadius: 2 }}
                    >
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(phase.doneCount / phase.total) * 100}%`,
                          height: 4,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Expanded lesson list ── */}
                <div
                  className={`phase-body${isOpen ? "" : " collapsed"}`}
                  style={{ maxHeight: isOpen ? phase.lessons.length * 60 + 16 : 0 }}
                >
                  <div style={{ paddingTop: 4, paddingBottom: 12 }}>
                    {phase.lessons.map((lesson) => {
                      const isComplete = completedLessonIds.includes(lesson.id);
                      const isCurrent = lesson.id === currentLesson.id;
                      const tappable = isComplete || isCurrent;
                      const letters = (lesson.teachIds || [])
                        .map((id) => getLetter(id))
                        .filter(Boolean);
                      const letterPreview = letters
                        .slice(0, 3)
                        .map((l) => l.letter)
                        .join(" ");

                      return (
                        <div
                          key={lesson.id}
                          className="phase-lesson-row"
                          onClick={() => {
                            if (tappable && onStartLesson) {
                              sfxTap();
                              onStartLesson(lesson.id);
                            }
                          }}
                          style={{
                            cursor: tappable ? "pointer" : "default",
                            opacity: !isComplete && !isCurrent ? 0.45 : 1,
                          }}
                        >
                          {/* Lesson status icon */}
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: isComplete
                                ? "var(--c-primary)"
                                : isCurrent
                                ? "var(--c-bg-card)"
                                : "var(--c-bg)",
                              border: isComplete
                                ? "none"
                                : isCurrent
                                ? "2px solid var(--c-primary)"
                                : "1.5px solid var(--c-border)",
                              boxShadow: isCurrent
                                ? "0 0 0 3px rgba(22,51,35,0.08)"
                                : "none",
                            }}
                          >
                            {isComplete ? (
                              <Icons.Check size={12} color="white" />
                            ) : isCurrent ? (
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "var(--c-primary)",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "var(--c-border)",
                                }}
                              />
                            )}
                          </div>

                          {/* Lesson info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: isCurrent ? 700 : 500,
                                color: isCurrent
                                  ? "var(--c-primary)"
                                  : isComplete
                                  ? "var(--c-text)"
                                  : "var(--c-text-muted)",
                                lineHeight: 1.3,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {lesson.title}
                            </div>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "var(--c-accent)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Up next
                              </span>
                            )}
                          </div>

                          {/* Letter preview */}
                          {letterPreview && (
                            <span
                              style={{
                                fontFamily: "var(--font-arabic)",
                                fontSize: 18,
                                color: isComplete
                                  ? "var(--c-primary)"
                                  : "var(--c-text-muted)",
                                opacity: isComplete || isCurrent ? 0.7 : 0.35,
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                              dir="rtl"
                            >
                              {letterPreview}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Letter Mastery grid ── */}
        <h3
          className="fade-up"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          All Letters
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {ARABIC_LETTERS.map((l, i) => {
            const p = progress[l.id] || { correct: 0, attempts: 0 };
            const learned = learnedIds.includes(l.id);
            const started = p.attempts > 0;
            const isSelected = selectedLetterId === l.id;
            return (
              <div
                key={l.id}
                className="card fade-up"
                onClick={() => {
                  if (learned) {
                    sfxTap();
                    setSelectedLetterId(isSelected ? null : l.id);
                  }
                }}
                style={{
                  textAlign: "center",
                  padding: "8px 4px",
                  animationDelay: `${0.15 + i * 0.015}s`,
                  border: isSelected
                    ? "2px solid var(--c-accent)"
                    : learned
                    ? "2px solid var(--c-primary)"
                    : "2px solid transparent",
                  background: isSelected
                    ? "var(--c-accent-light)"
                    : learned
                    ? "var(--c-primary-soft)"
                    : "var(--c-bg-card)",
                  opacity: started || learned ? 1 : 0.3,
                  cursor: learned ? "pointer" : "default",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-arabic)",
                    fontSize: 24,
                    lineHeight: 1.4,
                    display: "block",
                    color: learned
                      ? "var(--c-primary-dark)"
                      : started
                      ? "var(--c-text)"
                      : "var(--c-text-muted)",
                  }}
                >
                  {l.letter}
                </span>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    marginTop: 2,
                    color: learned ? "var(--c-primary)" : "var(--c-text-muted)",
                  }}
                >
                  {learned
                    ? l.name
                    : started
                    ? `${p.correct}/${p.attempts}`
                    : "\u2014"}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Letter Detail Modal ── */}
        <LetterDetailModal
          letter={selectedLetter}
          progress={progress}
          isOpen={!!selectedLetter}
          onClose={() => setSelectedLetterId(null)}
        />

        {/* ── Data Management ── */}
        <h3
          className="fade-up"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 16,
            fontWeight: 600,
            marginTop: 32,
            marginBottom: 14,
          }}
        >
          Your Data
        </h3>
        <div
          className="fade-up"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            animationDelay: "0.5s",
          }}
        >
          <button
            onClick={() => {
              const json = exportProgressJSON();
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `tila-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              background: "none",
              border: "1.5px solid var(--c-primary)",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--c-primary)",
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
            }}
          >
            Export Backup
          </button>
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const ok = importProgressJSON(ev.target.result);
                  if (ok) {
                    window.alert("Backup restored successfully. The app will reload.");
                    location.reload();
                  } else {
                    window.alert("Invalid backup file. Please try again.");
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            style={{
              background: "none",
              border: "1.5px solid var(--c-border)",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--c-text-muted)",
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
            }}
          >
            Restore Backup
          </button>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
                resetProgress();
              }
            }}
            style={{
              background: "none",
              border: "1.5px solid var(--c-danger-light)",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--c-text-muted)",
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
              marginTop: 8,
            }}
          >
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
}
