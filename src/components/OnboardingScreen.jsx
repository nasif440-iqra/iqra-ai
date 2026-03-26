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

/* ── Floating background letters — shared across first 3 onboarding screens ── */
/* Spread across the full viewport as a living texture. Visible but not dominant. */
/* Re-key on each step so letters get fresh entrance animations on each transition. */
const floatingLetters = [
  { char: "\u0628", top: "3%",  left: "8%",   size: 30, opacity: 0.09, motion: { y: [0, 8, 0] },  floatDuration: 16 },
  { char: "\u0646", top: "5%",  left: "52%",  size: 26, opacity: 0.07, motion: { y: [0, -6, 0] }, floatDuration: 18 },
  { char: "\u0643", top: "7%",  left: "86%",  size: 28, opacity: 0.08, motion: { x: [0, 6, 0] },  floatDuration: 20 },
  { char: "\u0639", top: "22%", left: "3%",   size: 24, opacity: 0.08, motion: { y: [0, 7, 0] },  floatDuration: 15 },
  { char: "\u0642", top: "19%", left: "91%",  size: 28, opacity: 0.07, motion: { y: [0, -7, 0] }, floatDuration: 17 },
  { char: "\u062F", top: "40%", left: "5%",   size: 26, opacity: 0.07, motion: { x: [0, 5, 0] },  floatDuration: 19 },
  { char: "\u0633", top: "44%", left: "89%",  size: 24, opacity: 0.08, motion: { y: [0, 6, 0] },  floatDuration: 16 },
  { char: "\u0631", top: "62%", left: "7%",   size: 28, opacity: 0.09, motion: { y: [0, -6, 0] }, floatDuration: 18 },
  { char: "\u064A", top: "58%", left: "92%",  size: 26, opacity: 0.07, motion: { x: [0, -5, 0] }, floatDuration: 20 },
  { char: "\u0645", top: "78%", left: "10%",  size: 24, opacity: 0.08, motion: { y: [0, 7, 0] },  floatDuration: 17 },
  { char: "\u0647", top: "76%", left: "50%",  size: 28, opacity: 0.07, motion: { y: [0, -5, 0] }, floatDuration: 19 },
  { char: "\u062A", top: "82%", left: "85%",  size: 26, opacity: 0.08, motion: { x: [0, 6, 0] },  floatDuration: 16 },
];

/** Floating letters background layer. Remounts on key change for fresh entrance. */
function FloatingLettersLayer({ animKey }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {floatingLetters.map((l, i) => (
        <motion.span
          key={`${animKey}-${i}`}
          dir="rtl"
          style={{
            position: "absolute", top: l.top, left: l.left,
            fontFamily: "var(--font-arabic)", fontSize: l.size,
            color: "var(--c-primary)", pointerEvents: "none", userSelect: "none",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: l.opacity, y: 0, ...l.motion }}
          transition={{
            opacity: { delay: i * 0.06, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            y: l.motion?.y ? { duration: l.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : { delay: i * 0.06, duration: 0.6 },
            x: l.motion?.x ? { duration: l.floatDuration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : undefined,
          }}
        >
          {l.char}
        </motion.span>
      ))}
    </div>
  );
}

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
  const letterRevealTimerRef = useRef(null);

  const goNext = useCallback(() => {
    sfxOnboardingAdvance();
    setStep(s => s + 1);
  }, []);

  /* Splash — user-initiated (no auto-advance) */

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
      {/* Floating Arabic letters background — visible on first 3 screens, re-animate on each step */}
      {step <= 2 && <FloatingLettersLayer animKey={step} />}

      {/* Hide progress bar on splash and letter reveal (auto-advance screens) */}
      {step !== 0 && step !== 4 && (
        <div style={styles.progressContainer}>
          <ProgressBar current={step} total={TOTAL_STEPS} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 0: WELCOME — Brand introduction ── */}
        {step === 0 && (
          <motion.div key="splash" style={styles.splashRoot} {...dissolve} transition={{ duration: 0.8 }}>
            {/* Large warm ambient glow */}
            <motion.div
              style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,164,100,0.12) 0%, rgba(196,164,100,0.04) 50%, transparent 70%)", pointerEvents: "none" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Crescent + arch mark — inline SVG, no wordmark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "relative", zIndex: 1, marginBottom: 32 }}
            >
              <svg width="120" height="160" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Arch */}
                <path d="M24 148 L24 68 Q24 8 60 2 Q96 8 96 68 L96 148" stroke="var(--c-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <path d="M34 148 L34 72 Q34 20 60 12 Q86 20 86 72 L86 148" stroke="var(--c-primary)" strokeWidth="0.8" opacity="0.2" />
                {/* Keystone */}
                <circle cx="60" cy="2" r="3" fill="var(--c-accent)" opacity="0.8" />
                {/* Base dots */}
                <circle cx="24" cy="148" r="1.5" fill="var(--c-primary)" opacity="0.25" />
                <circle cx="96" cy="148" r="1.5" fill="var(--c-primary)" opacity="0.25" />
                {/* Crescent */}
                <circle cx="60" cy="62" r="32" fill="var(--c-primary)" />
                <circle cx="71" cy="52" r="26" fill="var(--c-bg)" />
                {/* Stars */}
                <circle cx="38" cy="30" r="2" fill="var(--c-primary)" opacity="0.35" style={{ animation: "sparkle 3s ease-in-out infinite" }} />
                <circle cx="85" cy="36" r="1.6" fill="var(--c-primary)" opacity="0.3" style={{ animation: "sparkle 3s ease-in-out infinite 0.7s" }} />
                <circle cx="78" cy="22" r="1.3" fill="var(--c-primary)" opacity="0.25" style={{ animation: "sparkle 3s ease-in-out infinite 1.4s" }} />
              </svg>
            </motion.div>

            {/* App name — large, confident */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "var(--font-heading)", fontSize: 44, fontWeight: 400, letterSpacing: "0.12em", color: "var(--c-text)", lineHeight: 1, position: "relative", zIndex: 1, marginBottom: 8 }}
            >tila</motion.h1>

            {/* Brand motto */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.7 }}
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--c-accent)", position: "relative", zIndex: 1, marginBottom: 24 }}
            >Read Beautifully</motion.p>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              style={{ fontSize: 16, color: "var(--c-text-soft)", fontWeight: 400, lineHeight: 1.6, textAlign: "center", maxWidth: 260, position: "relative", zIndex: 1, marginBottom: 40 }}
            >Learn to read the Quran,{"\n"}one letter at a time.</motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.6 }}
              style={{ width: "100%", maxWidth: 300, position: "relative", zIndex: 1 }}
            >
              <button className="btn btn-primary" onClick={goNext} style={{ width: "100%", fontSize: 16, padding: "16px 24px" }}>
                Get Started
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── STEP 1: SACRED — "Tilawat" ── */}
        {step === 1 && (
          <motion.div key="sacred" style={styles.splashRoot} {...blurIn}>
            {/* Warm glow behind the Arabic */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,164,100,0.15) 0%, rgba(196,164,100,0.04) 55%, transparent 72%)", pointerEvents: "none", animation: "noorBreath 4s ease-in-out infinite" }}
            />

            {/* Arabic calligraphy */}
            <motion.span
              {...stagger(0.15)}
              dir="rtl"
              style={{ fontFamily: "var(--font-arabic)", fontSize: 72, color: "var(--c-primary-dark)", lineHeight: 1, position: "relative", zIndex: 1, marginBottom: 28 }}
            >{"\u062A\u0650\u0644\u0627\u0648\u064E\u0629"}</motion.span>

            {/* Headline */}
            <motion.h1 {...stagger(0.35)} style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 600, lineHeight: 1.4, color: "var(--c-text)", marginBottom: 10, letterSpacing: "-0.01em", textAlign: "center", position: "relative", zIndex: 1, maxWidth: 300 }}>
              <StaggeredText text="To recite the Quran beautifully is" baseDelay={0.4} />
              <em className="shimmer-text" style={styles.tilaShimmer}> Tilawat</em>
            </motion.h1>

            {/* Motto */}
            <motion.p
              {...stagger(0.75)}
              style={{ fontSize: 13, letterSpacing: "0.08em", color: "var(--c-text-muted)", marginBottom: 40, position: "relative", zIndex: 1 }}
            >Recite. Reflect. Return.</motion.p>

            {/* CTA */}
            <motion.div {...stagger(0.9)} style={{ width: "100%", maxWidth: 300, position: "relative", zIndex: 1 }}>
              <button className="btn btn-primary" onClick={goNext} style={{ width: "100%", fontSize: 16, padding: "16px 24px" }}>
                Begin
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── STEP 2: HADITH — "Struggling is not failing" ── */}
        {step === 2 && (
          <motion.div key="hadith" style={styles.splashRoot} {...scaleBlur}>
            {/* Large ambient glow */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,164,100,0.12) 0%, rgba(196,164,100,0.04) 50%, transparent 70%)", pointerEvents: "none", animation: "noorBreath 5s ease-in-out infinite" }}
            />

            {/* Arch outline — subtle brand frame */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 1.0 }}
              style={{ position: "absolute", zIndex: 0, pointerEvents: "none" }}
            >
              <svg width="200" height="260" viewBox="0 0 200 260" fill="none">
                <path d="M30 250 L30 100 Q30 10 100 2 Q170 10 170 100 L170 250" stroke="var(--c-accent)" strokeWidth="1" strokeLinecap="round" opacity="0.12" />
              </svg>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 600, lineHeight: 1.3, color: "var(--c-text)", letterSpacing: "-0.02em", position: "relative", zIndex: 1, marginBottom: 20, fontStyle: "italic" }}
            >
              Struggling is not failing
            </motion.h1>

            {/* Gold diamond separator */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.6, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              style={{ width: 6, height: 6, background: "var(--c-accent)", transform: "rotate(45deg)", marginBottom: 20, position: "relative", zIndex: 1 }}
            />

            {/* Hadith quote */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              style={{ position: "relative", zIndex: 1, maxWidth: 280, marginBottom: 20, textAlign: "center" }}
            >
              <p style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: 17, lineHeight: 1.7, color: "var(--c-text-soft)", margin: 0 }}>
                {"\u201C"}The one who struggles with the Qur{"\u2019"}an receives a double reward.{"\u201D"}
              </p>
            </motion.div>

            {/* Source — divider + attribution */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.5 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 40, position: "relative", zIndex: 1 }}
            >
              <div style={{ width: 28, height: 1, background: "var(--c-accent)", opacity: 0.4 }} />
              <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                Sahih al-Bukhari 4937
              </p>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.9, duration: 0.5 }}
              style={{ width: "100%", maxWidth: 300, position: "relative", zIndex: 1 }}
            >
              <button className="btn btn-primary" onClick={goNext} style={{ width: "100%", fontSize: 16, padding: "16px 24px" }}>
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
    justifyContent: "flex-start",
    paddingTop: "18vh",
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
  tilaShimmer: {
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
