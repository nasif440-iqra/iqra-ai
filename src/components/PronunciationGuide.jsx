import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "./Icons.jsx";
import { playLetterAudio } from "../lib/audio.js";
import { getLetter } from "../data/letters.js";

/** Inline letter reference: Arabic glyph + (Name) — no audio button */
function LetterRef({ letterId, color = "var(--c-text)" }) {
  const l = getLetter(letterId);
  if (!l) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle" }}>
      <span style={{ fontFamily: "var(--font-arabic)", fontSize: 17, color, lineHeight: 1 }} dir="rtl">{l.letter}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>({l.name})</span>
    </span>
  );
}

/** Render text with {id:N} tokens replaced by LetterRef components */
function RichText({ text, style }) {
  if (!text) return null;
  const parts = text.split(/(\{id:\d+\})/g);
  return (
    <p style={{ fontSize: 13, color: "var(--c-text-soft)", lineHeight: 1.7, ...style }}>
      {parts.map((part, i) => {
        const match = part.match(/^\{id:(\d+)\}$/);
        if (match) return <LetterRef key={i} letterId={parseInt(match[1], 10)} />;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

/* Shared overlay backdrop */
function Overlay({ onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, WebkitTapHighlightColor: "transparent" }}
    />
  );
}

/* Center-modal animation */
const modalVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};
const modalTransition = { type: "spring", stiffness: 380, damping: 32 };

/* Fixed centering wrapper */
const modalWrapperStyle = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 301,
  pointerEvents: "none",
  padding: 20,
};

/* The actual modal panel */
const modalStyle = {
  width: "100%", maxWidth: 390, maxHeight: "80vh", overflowY: "auto",
  background: "var(--c-bg-card)", borderRadius: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
  padding: "24px 22px",
  pointerEvents: "auto",
};

/** Circular audio button */
function AudioBtn({ letterId, audioType, primary, size = 42 }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); playLetterAudio(letterId, audioType); }}
      style={{
        background: primary ? "var(--c-primary)" : "none",
        border: primary ? "none" : "2px solid var(--c-accent)",
        borderRadius: "50%", width: size, height: size, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "transform 0.15s",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label={`Hear letter`}
    >
      <Icons.Volume size={Math.round(size * 0.43)} color={primary ? "white" : "var(--c-accent)"} />
    </button>
  );
}

/** Pronunciation detail section — renders inline within a modal */
function PronunciationDetail({ letter, audioType, contrastWithId }) {
  const a = letter.articulation;
  if (!a) return null;

  const contrastLetter = contrastWithId ? getLetter(contrastWithId) : null;
  const contrastArticulation = contrastLetter?.articulation;

  let comparisonLetterId = contrastWithId || null;
  if (!comparisonLetterId && a.confusedWith) {
    const match = a.confusedWith.match(/\{id:(\d+)\}/);
    if (match) comparisonLetterId = parseInt(match[1], 10);
  }

  return (
    <>
      {/* Try This */}
      <div style={{ background: "var(--c-primary-soft)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Try this</p>
        <p style={{ fontSize: 14, color: "var(--c-primary-dark)", lineHeight: 1.65 }}>{a.tryThis}</p>
      </div>

      {/* Placement & manner */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Tongue placement</p>
          <RichText text={a.place} />
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>How it sounds</p>
          <RichText text={a.manner} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
          padding: "4px 10px", borderRadius: 8, alignSelf: "flex-start",
          background: a.breath === "voiced" ? "var(--c-accent-light)" : "var(--c-bg)",
          color: a.breath === "voiced" ? "var(--c-accent)" : "var(--c-text-muted)",
        }}>
          {a.breath === "voiced" ? "Voiced (vocal cords vibrate)" : "Unvoiced (no vibration)"}
        </span>
      </div>

      {/* Contrast-aware comparison section */}
      {contrastLetter ? (
        <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Compared with {contrastLetter.letter} ({contrastLetter.name})
          </p>
          {contrastArticulation ? (
            <div style={{ background: "var(--c-bg)", borderRadius: 12, padding: "10px 12px", border: "1px solid var(--c-border)" }}>
              <p style={{ fontSize: 12.5, color: "var(--c-text-soft)", lineHeight: 1.6, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "var(--c-text)" }}>{contrastLetter.letter} ({contrastLetter.name}):</span> {contrastArticulation.place}
              </p>
              <p style={{ fontSize: 12.5, color: "var(--c-text-soft)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: "var(--c-text)" }}>{letter.letter} ({letter.name}):</span> {a.place}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--c-text-soft)", lineHeight: 1.6 }}>
              {contrastLetter.name} sounds like "{contrastLetter.transliteration}" — {contrastLetter.soundHint}. Compare with {letter.name}: "{letter.transliteration}" — {letter.soundHint}.
            </p>
          )}
        </div>
      ) : a.confusedWith ? (
        <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Common confusion</p>
          <RichText text={a.confusedWith} />
        </div>
      ) : null}

      {/* Audio buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => playLetterAudio(letter.id, audioType)}
          className="btn btn-primary"
          style={{ flex: 1, fontSize: 13, padding: "12px 10px" }}
        >
          <Icons.Volume size={17} color="white" /> Hear {letter.name}
        </button>
        {comparisonLetterId && (() => {
          const cl = getLetter(comparisonLetterId);
          if (!cl) return null;
          return (
            <button
              onClick={() => playLetterAudio(comparisonLetterId, audioType)}
              className="btn btn-outline"
              style={{ flex: 1, fontSize: 13, padding: "12px 10px", borderColor: "var(--c-border)" }}
            >
              <Icons.Volume size={17} color="var(--c-text-muted)" /> Hear {cl.name}
            </button>
          );
        })()}
      </div>
    </>
  );
}

/**
 * Trigger button + popup for pronunciation detail.
 * Used in lesson intros where only letters WITH articulation should show a trigger.
 */
export function PronunciationCard({ letter, audioType = "sound", defaultOpen = false, contrastWithId }) {
  const [open, setOpen] = useState(defaultOpen);
  const a = letter.articulation;
  if (!a) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "var(--c-bg-card)", border: "1px solid var(--c-border)",
          borderRadius: 16, cursor: "pointer",
          fontFamily: "var(--font-body)", textAlign: "left",
          WebkitTapHighlightColor: "transparent",
          transition: "border-color 0.2s",
        }}
      >
        <span style={{ fontFamily: "var(--font-arabic)", fontSize: 24, color: "var(--c-primary-dark)", lineHeight: 1 }} dir="rtl">{letter.letter}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>How to pronounce {letter.name}</span>
        <span style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 500 }}>Tap</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <Overlay onClick={() => setOpen(false)} />
            <div style={modalWrapperStyle}>
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={modalTransition}
              style={modalStyle}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--c-primary-soft)", border: "2px solid var(--c-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-arabic)", fontSize: 28, color: "var(--c-primary-dark)", lineHeight: 1, marginTop: 4 }} dir="rtl">{letter.letter}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>{letter.name}</div>
                  <div style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 600 }}>"{letter.transliteration}" — {letter.soundHint}</div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <Icons.X size={20} color="var(--c-text-muted)" />
                </button>
              </div>

              <PronunciationDetail letter={letter} audioType={audioType} contrastWithId={contrastWithId} />
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Full letter detail modal — used by ProgressScreen.
 * Shows letter info, stats, tip, and pronunciation guide (if available).
 * Same modal experience for ALL letters — consistent interaction.
 */
export function LetterDetailModal({ letter, progress, isOpen, onClose }) {
  if (!letter || !isOpen) return null;

  const stats = progress?.[letter.id];
  const hasStats = stats && stats.attempts > 0;
  const accuracy = hasStats ? Math.round((stats.correct / stats.attempts) * 100) : null;
  const a = letter.articulation;

  // Find comparison letter for audio buttons
  let comparisonLetterId = null;
  if (a?.confusedWith) {
    const match = a.confusedWith.match(/\{id:(\d+)\}/);
    if (match) comparisonLetterId = parseInt(match[1], 10);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Overlay onClick={onClose} />
          <div style={modalWrapperStyle}>
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={modalTransition}
              style={modalStyle}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "var(--c-primary-soft)",
                  border: "2px solid var(--c-primary)", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-primary-dark)", lineHeight: 1, marginTop: 4 }} dir="rtl">{letter.letter}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>{letter.name}</div>
                  <div style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 600 }}>"{letter.transliteration}" — {letter.soundHint}</div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <Icons.X size={20} color="var(--c-text-muted)" />
                </button>
              </div>

              {/* Tip */}
              <p style={{ fontSize: 14, color: "var(--c-text-soft)", lineHeight: 1.6, marginBottom: 14 }}>{letter.tip}</p>

              {/* Stats */}
              {hasStats && (
                <div style={{
                  display: "flex", gap: 16, marginBottom: 16, padding: "10px 14px",
                  background: "var(--c-bg)", borderRadius: 12, border: "1px solid var(--c-border)",
                }}>
                  <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
                    <span style={{ fontWeight: 700, color: "var(--c-primary)", fontSize: 16 }}>{stats.correct}</span>
                    <span>/{stats.attempts} correct</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
                    <span style={{ fontWeight: 700, color: accuracy >= 80 ? "var(--c-primary)" : accuracy >= 50 ? "var(--c-accent)" : "var(--c-danger)", fontSize: 16 }}>{accuracy}%</span>
                    <span> accuracy</span>
                  </div>
                </div>
              )}

              {/* Audio buttons — always present */}
              {!a && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button
                    onClick={() => playLetterAudio(letter.id, "name")}
                    className="btn btn-outline"
                    style={{ flex: 1, fontSize: 13, padding: "12px 10px", borderColor: "var(--c-border)" }}
                  >
                    <Icons.Volume size={17} color="var(--c-primary)" /> Hear name
                  </button>
                  <button
                    onClick={() => playLetterAudio(letter.id, "sound")}
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: 13, padding: "12px 10px" }}
                  >
                    <Icons.Volume size={17} color="white" /> Hear sound
                  </button>
                </div>
              )}

              {/* Pronunciation guide — renders inline for letters with articulation */}
              {a && <PronunciationDetail letter={letter} audioType="sound" />}

              {/* Visual rule */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginTop: a ? 16 : 0,
                padding: "8px 12px", background: "var(--c-bg)", borderRadius: 10,
                border: "1px solid var(--c-border)",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Visual</span>
                <span style={{ fontSize: 12, color: "var(--c-text-soft)" }}>{letter.visualRule}</span>
                <span style={{ fontSize: 11, color: "var(--c-text-muted)", marginLeft: "auto" }}>Family: {letter.family}</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Side-by-side comparison popup for two letters' pronunciation.
 * Used in wrong-answer panels when the user confuses similar-sounding letters.
 */
export function PronunciationCompare({ chosenLetter, correctLetter, audioType = "sound" }) {
  const [open, setOpen] = useState(false);
  const ca = chosenLetter?.articulation;
  const ta = correctLetter?.articulation;

  if (!ca && !ta) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-outline"
        style={{ width: "100%", fontSize: 13, padding: "10px 14px", borderColor: "var(--c-border)" }}
      >
        How do they differ?
      </button>

      <AnimatePresence>
        {open && (
          <>
            <Overlay onClick={() => setOpen(false)} />
            <div style={modalWrapperStyle}>
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={modalTransition}
              style={modalStyle}
            >
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--c-text)" }}>How do they differ?</h3>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <Icons.X size={20} color="var(--c-text-muted)" />
                </button>
              </div>

              {/* Correct letter — emphasized */}
              {ta && (
                <div style={{ background: "var(--c-primary-soft)", borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: "1px solid rgba(22,51,35,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-arabic)", fontSize: 28, color: "var(--c-primary-dark)", lineHeight: 1 }} dir="rtl">{correctLetter.letter}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-primary)" }}>{correctLetter.name}</span>
                      <span style={{ fontSize: 11, color: "var(--c-primary)", marginLeft: 6, fontWeight: 500 }}>Correct answer</span>
                    </div>
                    <AudioBtn letterId={correctLetter.id} audioType={audioType} primary />
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--c-primary-dark)", lineHeight: 1.5, marginBottom: 8 }}>{ta.place}</p>
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-primary)", marginBottom: 3 }}>Try this:</p>
                    <p style={{ fontSize: 13, color: "var(--c-primary-dark)", lineHeight: 1.6 }}>{ta.tryThis}</p>
                  </div>
                </div>
              )}

              {/* Chosen letter — subdued */}
              {ca && (
                <div style={{ background: "var(--c-bg)", borderRadius: 16, padding: "14px 16px", marginBottom: 16, border: "1px solid var(--c-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--font-arabic)", fontSize: 28, color: "var(--c-text-muted)", lineHeight: 1 }} dir="rtl">{chosenLetter.letter}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text-muted)" }}>{chosenLetter.name}</span>
                      <span style={{ fontSize: 11, color: "var(--c-text-muted)", marginLeft: 6, fontWeight: 500 }}>Your pick</span>
                    </div>
                    <AudioBtn letterId={chosenLetter.id} audioType={audioType} />
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--c-text-soft)", lineHeight: 1.5 }}>{ca.place}</p>
                </div>
              )}

              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="btn btn-primary"
                style={{ fontSize: 14 }}
              >
                Got it
              </button>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
