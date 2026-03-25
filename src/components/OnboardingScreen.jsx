import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playLetterAudio, sfxTap, sfxCorrect, sfxOnboardingAdvance, sfxOnboardingComplete, sfxAudioButton } from "../lib/audio.js";

const TOTAL_STEPS = 8;

const startingPointOptions = [
  "I'm completely new",
  "I know a few letters",
  "I used to learn, but forgot a lot",
  "I can read a little, but want stronger basics",
];

/* ── Transition variants ── */
const dissolve = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.6 },
};

const blurIn = {
  initial: { opacity: 0, filter: "blur(12px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(8px)" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

const scaleBlur = {
  initial: { opacity: 0, scale: 0.92, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 1.04, filter: "blur(4px)" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const slideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5, ease: [0, 0, 0.2, 1] },
};

const stagger = (delay) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0, 0, 0.2, 1], delay },
});

/* ── Floating background letters for hadith screen ── */
/* Three-layer depth system: far (atmospheric edges), mid (arc backbone), near (bridge to content) */
const floatingLetters = [
  // Layer 1 — Far background (barely visible, large, slow — like clouds drifting)
  { char: "ب", top: "4%",  left: "82%", size: 64, opacity: 0.05,
    motion: { x: [0, 12, 0] }, floatDuration: 14, entranceDelay: 0 },
  { char: "ن", top: "10%", left: "6%",  size: 56, opacity: 0.04,
    motion: { y: [0, -15, 0] }, floatDuration: 12, entranceDelay: 0 },
  { char: "ك", top: "2%",  left: "44%", size: 58, opacity: 0.04,
    motion: { y: [0, -12, 0], rotate: [0, -3, 0] }, floatDuration: 13, entranceDelay: 0 },

  // Layer 2 — Mid-ground arc (visible but soft — like leaves in still water)
  { char: "ع", top: "18%", left: "20%", size: 40, opacity: 0.11,
    motion: { x: [0, 10, 0], y: [0, -12, 0] }, floatDuration: 8, entranceDelay: 0.3 },
  { char: "ه", top: "22%", left: "38%", size: 34, opacity: 0.10,
    motion: { x: [0, -9, 0], y: [0, 7, 0] }, floatDuration: 7.5, entranceDelay: 0.4 },
  { char: "ق", top: "14%", left: "50%", size: 36, opacity: 0.09,
    motion: { rotate: [0, 8, 0], y: [0, -9, 0] }, floatDuration: 9, entranceDelay: 0.5 },
  { char: "د", top: "12%", left: "66%", size: 38, opacity: 0.08,
    motion: { y: [0, -11, 0], rotate: [0, 7, 0] }, floatDuration: 8.5, entranceDelay: 0.6 },
  { char: "س", top: "20%", left: "74%", size: 44, opacity: 0.12,
    motion: { x: [0, -11, 0], y: [0, 8, 0] }, floatDuration: 7, entranceDelay: 0.7 },

  // Layer 3 — Near foreground (most visible, bridge to content)
  { char: "ر", top: "30%", left: "32%", size: 26, opacity: 0.17,
    motion: { y: [0, -14, 0], scale: [1, 1.05, 1] }, floatDuration: 5.5, entranceDelay: 0.9 },
  { char: "ي", top: "34%", left: "14%", size: 22, opacity: 0.14,
    motion: { x: [0, 6, 0], y: [0, -7, 0], scale: [1, 1.04, 1] }, floatDuration: 5, entranceDelay: 1.0 },
  { char: "م", top: "28%", left: "64%", size: 24, opacity: 0.15,
    motion: { x: [0, 12, 0], y: [0, -6, 0] }, floatDuration: 6, entranceDelay: 1.1 },
  { char: "ت", top: "32%", left: "80%", size: 28, opacity: 0.16,
    motion: { y: [0, -9, 0], x: [0, -5, 0] }, floatDuration: 5.8, entranceDelay: 1.2 },
];

/* ── Word-by-word text ── */
function StaggeredText({ text, baseDelay = 0, style }) {
  const words = text.split(" ");
  return (
    <span style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block", marginRight: "0.3em" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: baseDelay + i * 0.08, duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ── Particles burst ── */
function Particles({ show }) {
  if (!show) return null;
  const particles = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 2 * Math.PI;
    const dist = 40 + Math.random() * 40;
    return {
      tx: `${Math.cos(angle) * dist}px`,
      ty: `${Math.sin(angle) * dist}px`,
      delay: Math.random() * 0.15,
    };
  });
  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="ob-particle"
          style={{
            "--tx": p.tx,
            "--ty": p.ty,
            animation: `shoot 0.6s ${p.delay}s ease-out forwards`,
            opacity: 1,
          }}
        />
      ))}
    </div>
  );
}

/* ── Segmented progress bar ── */
function ProgressBar({ current, total }) {
  return (
    <div style={styles.progressBar}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="ob-progress-track">
          <div
            className="ob-progress-fill"
            style={{
              width: i < current ? "100%" : i === current ? "50%" : "0%",
              background: i <= current ? "var(--c-primary)" : "transparent",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function OnboardingScreen({ onComplete, onStartLesson1 }) {
  const [step, setStep] = useState(0);
  const [selectedStartingPoint, setSelectedStartingPoint] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerChecked, setAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [playPulse, setPlayPulse] = useState(false);
  const splashTimerRef = useRef(null);
  const letterRevealTimerRef = useRef(null);

  const goNext = useCallback(() => {
    sfxOnboardingAdvance();
    setStep(s => s + 1);
  }, []);

  /* Splash auto-advance */
  useEffect(() => {
    if (step === 0) {
      splashTimerRef.current = setTimeout(() => {
        setStep(1);
      }, 3500);
      return () => clearTimeout(splashTimerRef.current);
    }
  }, [step]);

  /* Letter reveal auto-advance */
  useEffect(() => {
    if (step === 4) {
      letterRevealTimerRef.current = setTimeout(() => {
        setStep(5);
      }, 3500);
      return () => clearTimeout(letterRevealTimerRef.current);
    }
  }, [step]);

  const handlePlayAudio = () => {
    sfxAudioButton();
    playLetterAudio(1, "name");
    setHasPlayedAudio(true);
    setPlayPulse(true);
    setTimeout(() => setPlayPulse(false), 400);
  };

  const handleAnswerSelect = (option) => {
    if (answerChecked) return;
    sfxTap();
    setSelectedAnswer(option);
  };

  const handleCheckAnswer = () => {
    const correct = selectedAnswer === "Alif";
    setIsCorrect(correct);
    setAnswerChecked(true);
    if (correct) {
      sfxCorrect();
    } else {
      // Wrong answer: allow retry after a brief moment
      setTimeout(() => {
        setAnswerChecked(false);
        setIsCorrect(null);
        setSelectedAnswer("");
      }, 1200);
    }
  };

  const handleFinish = () => {
    sfxOnboardingComplete();
    onComplete({ startingPoint: selectedStartingPoint });
    onStartLesson1();
  };

  return (
    <div style={styles.root}>
      {/* Hide progress bar on splash and letter reveal (auto-advance screens) */}
      {step !== 0 && step !== 4 && (
        <div style={styles.progressContainer}>
          <ProgressBar current={step} total={TOTAL_STEPS} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 0: SPLASH — Brand reveal ── */}
        {step === 0 && (
          <motion.div key="splash" style={styles.splashRoot} {...dissolve} transition={{ duration: 0.8 }}>
            {/* Glow orb */}
            <motion.div
              className="glow-orb-warm"
              style={styles.splashGlow}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Arabic brand text — single node, not split */}
            <motion.span
              dir="rtl"
              style={styles.splashArabic}
              initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              اقْرَأْ
            </motion.span>

            {/* English subtitle */}
            <motion.p
              style={styles.splashSubtitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.8 }}
            >
              Read. Learn. Begin.
            </motion.p>
          </motion.div>
        )}

        {/* ── STEP 1: SACRED — "The first word revealed was Iqra" ── */}
        {step === 1 && (
          <motion.div key="sacred" style={styles.card} {...blurIn}>
            <motion.div {...stagger(0.15)} style={styles.sacredFocal}>
              <div style={styles.sacredGlow} />
              <span style={styles.sacredArabic} dir="rtl">اقْرَأْ</span>
            </motion.div>

            <motion.h1 {...stagger(0.3)} style={styles.headline}>
              <StaggeredText text="The first word revealed was" baseDelay={0.35} />
              <em className="shimmer-text" style={styles.iqraShimmer}> Iqra</em>
            </motion.h1>

            <motion.p {...stagger(0.7)} style={styles.body}>
              Read. Recite. Begin.
            </motion.p>

            <motion.div {...stagger(0.85)} style={styles.actions}>
              <button className="btn btn-primary" onClick={goNext}>
                Begin
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── STEP 2: HADITH — "Struggling is not failing" (full-bleed immersive) ── */}
        {step === 2 && (
          <motion.div key="hadith" style={styles.hadithRoot} {...scaleBlur}>
            {/* Floating Arabic letters — three-layer depth system with staggered entrance */}
            {floatingLetters.map((l, i) => (
              <motion.span
                key={i}
                dir="rtl"
                style={{
                  position: "absolute",
                  top: l.top,
                  left: l.left,
                  fontFamily: "var(--font-arabic)",
                  fontSize: l.size,
                  color: "var(--c-text)",
                  pointerEvents: "none",
                  userSelect: "none",
                  willChange: "transform",
                }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: l.opacity,
                  ...l.motion,
                }}
                transition={{
                  opacity: { delay: l.entranceDelay, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
                  x: l.motion?.x ? { duration: l.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : undefined,
                  y: l.motion?.y ? { duration: l.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : undefined,
                  rotate: l.motion?.rotate ? { duration: l.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : undefined,
                  scale: l.motion?.scale ? { duration: l.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : undefined,
                }}
              >
                {l.char}
              </motion.span>
            ))}

            {/* Large ambient glow — 350px, positioned behind quote area, 6s breathe */}
            <div style={styles.hadithGlow} />

            {/* Headline — slow fade + scale 0.97→1.0 */}
            <motion.h1
              style={styles.hadithHeadline}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1.0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              Struggling is not failing
            </motion.h1>

            {/* Decorative gold diamond above quote */}
            <motion.div
              style={styles.hadithDiamond}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            />

            {/* Hadith quote — clean centered typography, inline quotation marks */}
            <div style={styles.hadithQuoteBlock}>
              <p style={styles.hadithQuoteText}>
                <StaggeredText
                  text={"\u201CThe one who struggles with the Qur\u2019an receives a double reward.\u201D"}
                  baseDelay={0.8}
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontStyle: "italic",
                    fontSize: 17,
                    lineHeight: 1.65,
                    color: "var(--c-text-soft)",
                    textAlign: "center",
                  }}
                />
              </p>
            </div>

            {/* Divider DRAWS from center outward, then source fades in */}
            <div style={styles.hadithSourceBlock}>
              <motion.div
                style={styles.hadithDivider}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 2.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.p
                style={styles.hadithSource}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 0.4 }}
              >
                Sahih al-Bukhari 4937
              </motion.p>
            </div>

            {/* Continue button — delayed 2.2s to force sitting with the hadith */}
            <motion.div
              style={{ ...styles.actions, maxWidth: 380, padding: "0 28px" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.5 }}
            >
              <button className="btn btn-primary" onClick={goNext}>
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── STEP 3: STARTING POINT ── */}
        {step === 3 && (
          <motion.div key="starting" style={styles.card} {...slideUp}>
            <motion.h1 {...stagger(0.1)} style={styles.headline}>
              Where are you starting from?
            </motion.h1>

            <motion.p {...stagger(0.18)} style={{ ...styles.body, marginBottom: 20 }}>
              Choose what feels most true right now.
            </motion.p>

            <motion.div {...stagger(0.25)} style={styles.optionsContainer}>
              {startingPointOptions.map((option, idx) => (
                <motion.button
                  key={option}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.06, duration: 0.4 }}
                  style={{
                    ...styles.optionBtn,
                    ...(selectedStartingPoint === option ? styles.optionSelected : {}),
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={() => { sfxTap(); setSelectedStartingPoint(option); }}
                >
                  {/* Border wipe animation on selected */}
                  {selectedStartingPoint === option && (
                    <div style={styles.borderWipeOverlay} />
                  )}
                  {option}
                </motion.button>
              ))}
            </motion.div>

            <div style={styles.actions}>
              <button
                className="btn btn-primary"
                disabled={!selectedStartingPoint}
                style={!selectedStartingPoint ? styles.btnDisabled : {}}
                onClick={goNext}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: LETTER REVEAL — Alif dramatic entrance (auto-advance) ── */}
        {step === 4 && (
          <motion.div key="letter1" style={styles.letterRevealRoot} {...dissolve} transition={{ duration: 0.8 }}>
            <motion.p
              style={styles.firstWinLabel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Your first letter
            </motion.p>

            {/* Large Alif with glow */}
            <motion.div style={styles.letterRevealContainer}>
              <motion.div
                className="glow-orb-warm"
                style={styles.letterBigGlow}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                dir="rtl"
                style={styles.letterBigArabic}
                initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ delay: 0.8, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              >
                ا
              </motion.span>
            </motion.div>

            <motion.span
              style={styles.letterRevealName}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.6 }}
            >
              Alif
            </motion.span>
          </motion.div>
        )}

        {/* ── STEP 5: LETTER AUDIO — Alif + play button ── */}
        {step === 5 && (
          <motion.div key="letter2" style={styles.card} {...blurIn}>
            <motion.p {...stagger(0.1)} style={styles.firstWinLabel}>
              Your first letter
            </motion.p>

            <motion.div {...stagger(0.2)} style={styles.letterCircleOuter}>
              <div style={styles.letterCircleGlow} />
              <div style={{ ...styles.letterCircle, animation: "floatLetter 3s ease-in-out infinite" }}>
                <span style={styles.letterArabic} dir="rtl">ا</span>
              </div>
              <span style={styles.letterName}>Alif</span>
            </motion.div>

            {/* Play button with pulsing hint ring */}
            <motion.div {...stagger(0.4)} style={{ marginBottom: 32, position: "relative" }}>
              {/* Pulse ring hint */}
              {!hasPlayedAudio && (
                <div style={styles.pulseRingContainer}>
                  <div style={styles.pulseRing} />
                </div>
              )}
              <button
                onClick={handlePlayAudio}
                style={{
                  ...styles.playBtn,
                  ...(playPulse ? { transform: "scale(1.08)", boxShadow: "0 4px 20px rgba(22,51,35,0.18)" } : {}),
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                <span>{hasPlayedAudio ? "Hear again" : "Hear it"}</span>
              </button>
            </motion.div>

            <motion.div {...stagger(0.55)} style={styles.actions}>
              <button className="btn btn-primary" onClick={goNext}>
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── STEP 6: LETTER QUIZ — "Which one is Alif?" (no labels until correct) ── */}
        {step === 6 && (
          <motion.div key="letter3" style={styles.card} {...slideUp}>
            <motion.p {...stagger(0.1)} style={styles.quizPrompt}>
              Which one is Alif?
            </motion.p>

            <motion.div {...stagger(0.2)} style={styles.answerRow}>
              {[
                { name: "Alif", arabic: "ا" },
                { name: "Ba", arabic: "ب" },
              ].map(({ name, arabic }) => {
                let btnStyle = { ...styles.answerBtn };
                const isThisCorrect = name === "Alif";
                const showCorrectReveal = answerChecked && isThisCorrect;
                const showWrongReveal = answerChecked && name === selectedAnswer && !isCorrect;

                if (showCorrectReveal) {
                  btnStyle = { ...btnStyle, ...styles.answerCorrect };
                } else if (showWrongReveal) {
                  btnStyle = { ...btnStyle, ...styles.answerWrong };
                } else if (!answerChecked && selectedAnswer === name) {
                  btnStyle = { ...btnStyle, ...styles.optionSelected };
                }

                return (
                  <motion.button
                    key={name}
                    style={btnStyle}
                    onClick={() => handleAnswerSelect(name)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span style={styles.answerArabic} dir="rtl">{arabic}</span>
                    {/* Only reveal the name label after correct answer, on the correct option */}
                    {answerChecked && isCorrect && isThisCorrect && (
                      <motion.span
                        style={styles.answerLabel}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                      >
                        Alif
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Feedback with particles */}
            {answerChecked && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ ...styles.feedbackContainer, position: "relative" }}
              >
                <Particles show={isCorrect} />
                <p style={{
                  ...styles.feedbackText,
                  color: isCorrect ? "var(--c-primary)" : "var(--c-text-soft)",
                }}>
                  {isCorrect
                    ? "Beautiful. You just read your first letter."
                    : "That's Ba — try the other one."}
                </p>
              </motion.div>
            )}

            <div style={styles.actions}>
              {!answerChecked ? (
                <button
                  className="btn btn-primary"
                  disabled={!selectedAnswer}
                  style={!selectedAnswer ? styles.btnDisabled : {}}
                  onClick={handleCheckAnswer}
                >
                  Check
                </button>
              ) : (
                <button className="btn btn-primary" onClick={goNext}>
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── STEP 7: TRANSITION — "You've already begun" (full-bleed immersive) ── */}
        {step === 7 && (
          <motion.div key="transition" style={styles.transitionRoot} {...scaleBlur}>
            {/* Ambient Alif callback — large faint watermark */}
            <motion.span
              dir="rtl"
              style={styles.transitionAlif}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.06 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              ا
            </motion.span>

            {/* Checkmark circle — scales in with spring overshoot */}
            <motion.div
              style={styles.transitionCheckCircle}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 180, damping: 12 }}
            >
              {/* Breathing glow ring behind */}
              <div style={styles.transitionCheckGlow} />
              {/* Pulsing ring on entrance */}
              <motion.div
                style={styles.transitionCheckPulse}
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline className="checkmark-path" points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            {/* Headline — word-by-word, shimmer on "begun" only */}
            <h1 style={styles.transitionHeadline}>
              {["You've", "already", "begun"].map((word, i) => (
                <motion.span
                  key={word}
                  style={{ display: "inline-block", marginRight: "0.3em" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.15, duration: 0.4, ease: [0, 0, 0.2, 1] }}
                >
                  {word === "begun" ? (
                    <span className="shimmer-text" style={{ fontFamily: "var(--font-heading)" }}>{word}</span>
                  ) : word}
                </motion.span>
              ))}
            </h1>

            {/* Subtext */}
            <motion.p
              style={styles.transitionBody}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.35, duration: 0.4 }}
            >
              Now let's take your first real lesson.
            </motion.p>

            {/* Start Lesson 1 — pulsing gold border glow */}
            <motion.div
              style={styles.actions}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.75, duration: 0.4 }}
            >
              <button
                className="btn btn-primary"
                style={{ animation: "pulsingGoldBorder 2.5s ease-in-out infinite" }}
                onClick={handleFinish}
              >
                Start Lesson 1
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    minHeight: "100dvh",
    padding: "32px 20px",
    background: "linear-gradient(180deg, var(--c-bg-warm) 0%, var(--c-bg) 60%)",
    position: "relative",
  },
  progressContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  progressBar: {
    display: "flex",
    gap: 4,
    width: "100%",
  },
  card: {
    background: "var(--c-bg-card)",
    borderRadius: "var(--radius)",
    padding: "40px 28px 36px",
    border: "1px solid var(--c-border)",
    boxShadow: "var(--shadow-card)",
    width: "100%",
    maxWidth: 380,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  headline: {
    fontFamily: "var(--font-heading)",
    fontSize: 23,
    fontWeight: 600,
    lineHeight: 1.35,
    color: "var(--c-text)",
    marginBottom: 12,
    letterSpacing: "-0.01em",
  },
  body: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--c-text-muted)",
    maxWidth: 280,
    marginBottom: 32,
  },
  actions: {
    width: "100%",
    marginTop: 4,
  },

  /* ── Splash ── */
  splashRoot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  splashGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: "50%",
    pointerEvents: "none",
  },
  splashArabic: {
    fontFamily: "var(--font-arabic)",
    fontSize: 80,
    color: "var(--c-text)",
    lineHeight: 1,
    position: "relative",
    zIndex: 1,
  },
  splashSubtitle: {
    fontSize: 14,
    color: "var(--c-text-muted)",
    marginTop: 16,
    letterSpacing: "0.04em",
    fontWeight: 500,
  },

  /* ── Sacred opening ── */
  sacredFocal: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  sacredGlow: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(196,164,100,0.18) 0%, rgba(196,164,100,0.05) 55%, transparent 72%)",
    animation: "noorBreath 4s ease-in-out infinite",
    pointerEvents: "none",
  },
  sacredArabic: {
    fontFamily: "var(--font-arabic)",
    fontSize: 80,
    color: "var(--c-primary-dark)",
    lineHeight: 1,
    position: "relative",
    zIndex: 1,
  },
  iqraShimmer: {
    fontFamily: "var(--font-heading)",
    fontStyle: "italic",
    fontSize: "inherit",
  },

  /* ── Hadith (full-bleed immersive) ── */
  hadithRoot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    position: "relative",
    textAlign: "center",
    paddingTop: "35vh", /* push content to lower 60% of screen */
  },
  hadithGlow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: "50%",
    top: "38%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, rgba(196,164,100,0.15) 0%, rgba(196,164,100,0.08) 40%, transparent 70%)",
    animation: "glowBreathSlow 6s ease-in-out infinite",
    pointerEvents: "none",
  },
  hadithHeadline: {
    fontFamily: "var(--font-heading)",
    fontSize: 30,
    fontWeight: 600,
    lineHeight: 1.3,
    color: "var(--c-text)",
    marginBottom: 20,
    letterSpacing: "-0.02em",
  },
  hadithDiamond: {
    width: 6,
    height: 6,
    background: "var(--c-accent)",
    transform: "rotate(45deg)",
    marginBottom: 16,
  },
  hadithQuoteBlock: {
    position: "relative",
    maxWidth: 300,
    marginBottom: 28,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  hadithQuoteText: {
    margin: 0,
    padding: 0,
  },
  hadithSourceBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    marginBottom: 36,
  },
  hadithDivider: {
    width: 32,
    height: 1,
    background: "var(--c-accent)",
    opacity: 0.5,
    transformOrigin: "center",
  },
  hadithSource: {
    fontFamily: "var(--font-body)",
    fontSize: 11,
    color: "var(--c-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    margin: 0,
  },

  /* ── Transition screen (step 7) — full-bleed immersive ── */
  transitionRoot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "calc(100dvh - 64px)",
    position: "relative",
    textAlign: "center",
    background: "linear-gradient(180deg, var(--c-bg-warm) 0%, var(--c-bg) 100%)",
    borderRadius: 0,
    padding: "40px 28px 36px",
  },
  transitionAlif: {
    position: "absolute",
    top: "8%",
    left: "50%",
    transform: "translateX(-50%)",
    fontFamily: "var(--font-arabic)",
    fontSize: 200,
    color: "var(--c-text)",
    lineHeight: 1,
    pointerEvents: "none",
    userSelect: "none",
    animation: "floatAlif 8s ease-in-out infinite",
  },
  transitionCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "var(--c-accent-light)",
    border: "2px solid rgba(196,164,100,0.40)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  transitionCheckGlow: {
    position: "absolute",
    inset: -12,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(196,164,100,0.15) 0%, transparent 70%)",
    animation: "glowBreathSlow 4s ease-in-out infinite",
    pointerEvents: "none",
  },
  transitionCheckPulse: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "2px solid var(--c-accent)",
    pointerEvents: "none",
  },
  transitionHeadline: {
    fontFamily: "var(--font-heading)",
    fontSize: 28,
    fontWeight: 600,
    lineHeight: 1.35,
    color: "var(--c-text)",
    marginBottom: 12,
    letterSpacing: "-0.01em",
  },
  transitionBody: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--c-text-soft)",
    maxWidth: 280,
    marginBottom: 32,
    fontFamily: "var(--font-body)",
  },

  /* ── Starting point options ── */
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    marginBottom: 20,
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 18px",
    borderRadius: "var(--radius-btn)",
    border: "2px solid var(--c-border)",
    background: "var(--c-bg-card)",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "var(--font-body)",
    color: "var(--c-text)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "center",
  },
  optionSelected: {
    borderColor: "var(--c-primary)",
    background: "var(--c-primary-soft)",
    color: "var(--c-primary)",
  },
  borderWipeOverlay: {
    position: "absolute",
    inset: -2,
    borderRadius: "var(--radius-btn)",
    border: "2px solid var(--c-primary)",
    animation: "borderWipe 0.3s ease-out forwards",
    pointerEvents: "none",
  },

  /* ── Letter reveal (step 4) ── */
  letterRevealRoot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  letterRevealContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 240,
    height: 240,
    marginBottom: 12,
  },
  letterBigGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: "50%",
    pointerEvents: "none",
  },
  letterBigArabic: {
    fontFamily: "var(--font-arabic)",
    fontSize: 120,
    color: "var(--c-primary-dark)",
    lineHeight: 1,
    position: "relative",
    zIndex: 1,
  },
  letterRevealName: {
    fontFamily: "var(--font-heading)",
    fontSize: 18,
    fontWeight: 600,
    color: "var(--c-text-muted)",
    letterSpacing: "0.04em",
  },
  firstWinLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "var(--c-accent)",
    marginBottom: 16,
  },

  /* ── Letter audio (step 5) ── */
  letterCircleOuter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  letterCircleGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    top: -16,
    left: "50%",
    marginLeft: -80,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(196,164,100,0.14) 0%, rgba(196,164,100,0.04) 55%, transparent 72%)",
    animation: "noorBreath 4s ease-in-out infinite",
    pointerEvents: "none",
  },
  letterCircle: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    background: "#F2F5F3",
    border: "2px solid white",
    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06), 0 4px 16px rgba(22,51,35,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 1,
  },
  letterArabic: {
    fontFamily: "var(--font-arabic)",
    fontSize: 72,
    color: "var(--c-primary-dark)",
    lineHeight: 1,
    marginTop: 8,
  },
  letterName: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--c-text-muted)",
    marginTop: 10,
    position: "relative",
    zIndex: 1,
  },
  playBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 22px",
    borderRadius: 999,
    border: "1.5px solid var(--c-border)",
    background: "var(--c-bg-card)",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "var(--font-body)",
    color: "var(--c-primary)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(22,51,35,0.05)",
    WebkitTapHighlightColor: "transparent",
    position: "relative",
    zIndex: 1,
  },
  pulseRingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  pulseRing: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "2px solid var(--c-accent)",
    animation: "pulseRing 1.5s ease-out infinite",
  },

  /* ── Quiz (step 6) ── */
  quizPrompt: {
    fontSize: 16,
    color: "var(--c-text-soft)",
    marginBottom: 20,
    fontWeight: 600,
  },
  answerRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
    width: "100%",
  },
  answerBtn: {
    flex: 1,
    padding: "18px 12px 14px",
    borderRadius: "var(--radius-btn)",
    border: "2.5px solid var(--c-border)",
    background: "var(--c-bg-card)",
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "var(--font-body)",
    color: "var(--c-text)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "var(--shadow-soft)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  answerArabic: {
    fontFamily: "var(--font-arabic)",
    fontSize: 36,
    lineHeight: 1.2,
    color: "inherit",
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "inherit",
    opacity: 0.7,
  },
  answerCorrect: {
    borderColor: "var(--c-primary)",
    background: "var(--c-primary-soft)",
    color: "var(--c-primary)",
  },
  answerWrong: {
    borderColor: "var(--c-danger)",
    background: "var(--c-danger-light)",
    color: "var(--c-danger)",
  },
  feedbackContainer: {
    marginBottom: 8,
    padding: "0 8px",
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.5,
  },

  btnDisabled: {
    opacity: 0.45,
    pointerEvents: "none",
  },
};
