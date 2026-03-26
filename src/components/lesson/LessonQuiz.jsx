import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "../Icons.jsx";
import { getLetter } from "../../data/letters.js";
import { playGeneratedArabicAudio } from "../../lib/tts.js";
import { playLetterAudio } from "../../lib/audio.js";
import StreakBanner from "./StreakBanner.jsx";
import { PronunciationCompare } from "../PronunciationGuide.jsx";

export default function LessonQuiz({
  currentQ, qIndex, originalQCount, progressPct,
  selected, isCorrect, answered, feedbackMsg, wrongExplanation,
  streak, bannerStreak,
  isHarakatLesson, isContrast, isSoundQ, audioType,
  onSelect, onNext, onBack, playQuestionAudio,
}) {
  const [showTint, setShowTint] = useState(false);

  useEffect(() => {
    if (bannerStreak !== null) {
      setShowTint(true);
      const t = setTimeout(() => setShowTint(false), 800);
      return () => clearTimeout(t);
    }
  }, [bannerStreak]);
  if (!currentQ) {
    return (
      <div className="screen" style={{ background: "var(--c-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--c-text-soft)", fontSize: 14 }}>Loading question...</p>
      </div>
    );
  }

  return (
    <div className="screen" style={{ background: "var(--c-bg)", justifyContent: "space-between" }}>
      {/* Streak banner */}
      <AnimatePresence>
        {bannerStreak !== null && (
          <StreakBanner key={bannerStreak} streak={bannerStreak} />
        )}
      </AnimatePresence>

      {/* Gold tint on streak milestone */}
      <AnimatePresence>
        {showTint && (
          <motion.div
            key="streak-tint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(196,164,100,0.06)",
              pointerEvents: "none", zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>

      {/* Wrong answer screen flash */}
      <AnimatePresence>
        {answered && !isCorrect && (
          <motion.div
            key={`wrong-flash-${qIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.4 }}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(189, 82, 77, 0.08)",
              pointerEvents: "none", zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} aria-label="Close lesson" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icons.X size={22} color="var(--c-text-soft)" /></button>
          <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100} style={{ flex: 1 }}>
            <motion.div
              className="progress-fill"
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text-soft)", minWidth: 40, textAlign: "right" }}>{Math.min(qIndex + 1, originalQCount)}/{originalQCount}</span>
        </div>
        {currentQ._recycled && (
          <p style={{ fontSize: 11, color: "var(--c-text-muted)", textAlign: "center", marginTop: 2, marginBottom: -8, fontStyle: "italic" }}>Review — missed questions come back once</p>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
          >
            {currentQ.hasAudio && (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <button onClick={() => playQuestionAudio(currentQ)} aria-label="Play audio" style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid var(--c-accent)", background: "var(--c-accent-light)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", transition: "all 0.2s", boxShadow: "0 2px 12px rgba(196,164,100,0.15)" }}>
                  <Icons.Volume size={32} color="var(--c-accent)" />
                </button>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text)" }}>{currentQ.prompt}</p>
                <button onClick={() => playQuestionAudio(currentQ)} aria-label="Replay sound" className="btn btn-ghost" style={{ fontSize: 14, color: "var(--c-accent)", marginTop: 4 }}><Icons.Volume size={16} color="var(--c-accent)" /> Replay sound</button>
              </div>
            )}
            {currentQ.type === "letter_to_sound" && (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div className="arabic-letter" style={{ fontSize: 100, lineHeight: 1.5, paddingBottom: 6 }}>{currentQ.prompt}</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--c-text-soft)", marginTop: 6 }}>{currentQ.promptSubtext}</p>
                <button onClick={() => playQuestionAudio(currentQ)} aria-label="Hear this letter" className="btn btn-ghost" style={{ fontSize: 14, color: "var(--c-accent)", marginTop: 4 }}><Icons.Volume size={16} color="var(--c-accent)" /> Hear this letter</button>
              </div>
            )}
            {currentQ.type === "letter_to_name" && !currentQ.hasAudio && (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div className="arabic-letter" style={{ fontSize: 110, lineHeight: 1.5, paddingBottom: 6 }}>{currentQ.prompt}</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--c-text-soft)", marginTop: 6 }}>{currentQ.promptSubtext}</p>
                {/* No audio hint here — the question tests whether the user can identify
                    the sound visually. TTS audio is available in the wrong-answer panel. */}
              </div>
            )}
            {!currentQ.hasAudio && currentQ.type !== "letter_to_name" && currentQ.type !== "letter_to_sound" && (
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>{currentQ.prompt}</p>
              </div>
            )}

            {(() => {
              const optCount = currentQ.options.length;
              const isCompact = optCount <= 2;
              const isTriple = optCount === 3;
              const gridStyle = isCompact
                ? { display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 340 }
                : isTriple
                  ? { display: "flex", flexWrap: "wrap", gap: 14, width: "100%", maxWidth: 340, justifyContent: "center" }
                  : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, width: "100%", maxWidth: 340 };
              return (
                <motion.div
                  variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                  initial="hidden"
                  animate="show"
                  style={gridStyle}
                >
                  {currentQ.options.map((opt, optIdx) => {
                    let cls = "quiz-option";
                    if (answered) { if (opt.id === selected && isCorrect) cls += " correct"; else if (opt.id === selected && !isCorrect) cls += " wrong"; else if (opt.isCorrect && !isCorrect) cls += " revealed-correct"; else cls += " disabled"; }
                    const isSndOpt = currentQ.optionMode === "sound";
                    const isArabicOpt = !isSndOpt && currentQ.type !== "letter_to_name";
                    const optPad = isCompact
                      ? (isSndOpt ? "18px 16px" : isArabicOpt ? "20px 16px" : "18px 16px")
                      : (isSndOpt ? "14px 8px" : isArabicOpt ? "20px 12px" : "18px 12px");
                    const optMin = isCompact
                      ? (isSndOpt ? 64 : isArabicOpt ? 80 : 56)
                      : (isSndOpt ? 70 : isArabicOpt ? 90 : 60);
                    const arabicSize = isCompact ? 56 : 48;
                    const sndSize = isCompact ? 22 : 20;
                    const isSelectedCorrect = answered && opt.id === selected && isCorrect;
                    const isSelectedWrong = answered && opt.id === selected && !isCorrect;
                    return (
                      <motion.button
                        key={opt.id}
                        variants={{
                          hidden: { opacity: 0, y: 16 },
                          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } }
                        }}
                        whileHover={!answered ? { scale: 1.02, borderColor: "var(--c-primary)", transition: { type: "spring", stiffness: 400, damping: 30 } } : undefined}
                        whileTap={!answered ? { scale: 0.94 } : undefined}
                        {...(isSelectedCorrect ? {
                          animate: { backgroundColor: ["#FFFFFF", "#E8F0EB", "#E8F0EB"], scale: [1, 1.04, 1] },
                          transition: { duration: 0.4, times: [0, 0.3, 1] }
                        } : isSelectedWrong ? {
                          animate: { x: [-6, 6, -5, 5, -3, 3, 0] },
                          transition: { duration: 0.4, ease: "easeOut" }
                        } : {
                          transition: { type: "spring", stiffness: 400, damping: 25 }
                        })}
                        className={cls}
                        onClick={() => onSelect(opt.id)}
                        disabled={answered}
                        aria-label={opt.ariaLabel || opt.label}
                        aria-pressed={opt.id === selected}
                        style={{ padding: optPad, minHeight: optMin, flexDirection: isCompact && isSndOpt ? "row" : "column", gap: isCompact && isSndOpt ? 10 : undefined, position: "relative", ...(isTriple ? { width: "calc(50% - 7px)", flexShrink: 0 } : {}) }}
                      >
                        {isSndOpt ? (<><span style={{ fontSize: sndSize, fontWeight: 800, color: (answered && opt.isCorrect) ? "var(--c-primary-dark)" : (answered && opt.id === selected && !isCorrect) ? "var(--c-danger)" : "var(--c-text)", lineHeight: 1 }}>{opt.label}</span>{opt.sublabel && <span style={{ fontSize: isCompact ? 12 : 11, color: "var(--c-text-muted)", marginTop: isCompact ? 0 : 4, textAlign: "center", lineHeight: 1.3 }}>{opt.sublabel}</span>}</>) : (
                          <span style={{ fontFamily: isArabicOpt ? "var(--font-arabic)" : "var(--font-body)", fontSize: isArabicOpt ? arabicSize : 18, fontWeight: isArabicOpt ? 400 : 700, color: (answered && opt.isCorrect) ? "var(--c-primary-dark)" : (answered && opt.id === selected && !isCorrect) ? "var(--c-danger)" : "var(--c-text)", lineHeight: isArabicOpt ? 1.5 : 1 }}>{opt.label}</span>
                        )}
                        <AnimatePresence>
                          {isSelectedCorrect && (
                            <motion.span
                              key={`plus1-${qIndex}`}
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
              );
            })()}
          </motion.div>
        </AnimatePresence>

        <div style={{ minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16, padding: "0 12px" }}>
          {answered && isCorrect && <div style={{ animation: "subtleLift 0.35s ease both", display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 999, background: "var(--c-primary-soft)", border: "1.5px solid var(--c-primary)", maxWidth: "100%", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(196,164,100,0.08) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 2s ease-in-out", pointerEvents: "none" }} />
            <Icons.Check size={18} color="var(--c-primary)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-primary-dark)", lineHeight: 1.3, position: "relative" }}>{feedbackMsg}</span>
          </div>}
        </div>
      </div>

      <div style={{ paddingBottom: 24, minHeight: 70 }}>
        {answered && !isCorrect && (() => {
          const chosenLetter = !currentQ.isHarakat ? getLetter(selected) : null;
          const correctLetter = !currentQ.isHarakat ? getLetter(currentQ.targetId) : null;
          const showVisualCompare = chosenLetter && correctLetter && chosenLetter.id !== correctLetter.id && !isSoundQ;
          return (
          <div style={{ animation: "subtleLift 0.4s ease both", background: "var(--c-danger-light)", borderRadius: 20, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icons.X size={18} color="var(--c-danger)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#7a2e2b", lineHeight: 1.5 }}>{wrongExplanation}</span>
            </div>
            {showVisualCompare && (
              <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "8px 0 4px", animation: "recapSlide 0.4s ease 0.15s both" }}>
                <div style={{ textAlign: "center", opacity: 0.5 }}>
                  <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-danger)", display: "block", lineHeight: 1.4 }}>{chosenLetter.letter}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7a2e2b" }}>{chosenLetter.name}</span>
                  {chosenLetter.visualRule && <span style={{ fontSize: 9, color: "#7a2e2b", display: "block", opacity: 0.7 }}>{chosenLetter.visualRule}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", fontSize: 14, color: "var(--c-text-muted)" }}>{"\u2192"}</div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-primary)", display: "block", lineHeight: 1.4 }}>{correctLetter.letter}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-primary)" }}>{correctLetter.name}</span>
                  {correctLetter.visualRule && <span style={{ fontSize: 9, color: "var(--c-primary)", display: "block", opacity: 0.8 }}>{correctLetter.visualRule}</span>}
                </div>
              </div>
            )}
            {(isSoundQ || currentQ.ttsText) && (
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button className="btn btn-outline" onClick={() => playQuestionAudio(currentQ)} style={{ flex: 1, fontSize: 13, padding: "10px 12px" }}>
                  <Icons.Volume size={16} color="var(--c-accent)" /> Hear correct
                </button>
                {!currentQ.ttsText && selected && selected !== currentQ.targetId && (
                  <button className="btn btn-outline" onClick={() => playLetterAudio(selected, audioType)} style={{ flex: 1, fontSize: 13, padding: "10px 12px", borderColor: "var(--c-danger-light)" }}>
                    <Icons.Volume size={16} color="var(--c-danger)" /> Hear your pick
                  </button>
                )}
              </div>
            )}
            {/* Pronunciation comparison for sound questions when both letters have articulation data */}
            {isSoundQ && chosenLetter && correctLetter && chosenLetter.id !== correctLetter.id && (chosenLetter.articulation || correctLetter.articulation) && (
              <PronunciationCompare chosenLetter={chosenLetter} correctLetter={correctLetter} audioType={audioType} />
            )}
            <button className="btn btn-primary" onClick={onNext} style={{ fontSize: 14, marginTop: 2 }}>Got It</button>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
