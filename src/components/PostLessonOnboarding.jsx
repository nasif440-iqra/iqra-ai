import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfxTap, sfxOnboardingAdvance, sfxOnboardingComplete } from "../lib/audio.js";

const TOTAL_STEPS = 3;

const motivationOptions = [
  "I want to read the Quran confidently",
  "I want to improve my prayer and understanding",
  "I want to build a daily Quran habit",
  "I want to reconnect properly",
  "I want to help my child or family learn",
];

const goalOptions = [
  { label: "3 minutes", value: "3", desc: "A gentle start" },
  { label: "5 minutes", value: "5", desc: "Most popular" },
  { label: "10 minutes", value: "10", desc: "Deep focus" },
];

/* ── Transition variants ── */
const slideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5, ease: [0, 0, 0.2, 1] },
};

const scaleBlur = {
  initial: { opacity: 0, scale: 0.92, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 1.04, filter: "blur(4px)" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const stagger = (delay) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0, 0, 0.2, 1], delay },
});

/* ── Count-up animation hook ── */
function useCountUp(target, duration = 600, active = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const num = parseInt(target, 10);
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * num));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, active]);

  return value;
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

/* ── Goal card with count-up ── */
function GoalCard({ option, isSelected, onSelect }) {
  const count = useCountUp(option.value, 500, isSelected);

  return (
    <motion.button
      style={{
        ...styles.goalBtn,
        ...(isSelected ? styles.goalSelected : {}),
      }}
      animate={{
        scale: isSelected ? 1.06 : 1,
        y: isSelected ? -4 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => { sfxTap(); onSelect(option.value); }}
    >
      <span style={styles.goalNumber}>
        {isSelected ? count : option.value}
      </span>
      <span style={styles.goalUnit}>min</span>
      <span style={styles.goalDesc}>{option.desc}</span>
    </motion.button>
  );
}

export default function PostLessonOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [selectedMotivation, setSelectedMotivation] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");

  const goNext = useCallback(() => {
    sfxOnboardingAdvance();
    setStep(s => s + 1);
  }, []);

  const handleFinish = () => {
    sfxOnboardingComplete();
    onComplete({ motivation: selectedMotivation, dailyGoal: selectedGoal });
  };

  return (
    <div style={styles.root}>
      <div style={styles.progressContainer}>
        <ProgressBar current={step} total={TOTAL_STEPS} />
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 0: MOTIVATION ── */}
        {step === 0 && (
          <motion.div key="motivation" style={styles.card} {...slideUp}>
            <motion.p {...stagger(0.08)} style={styles.contextLabel}>
              You completed your first lesson
            </motion.p>

            <motion.h1 {...stagger(0.18)} style={styles.headline}>
              Why does this matter to you?
            </motion.h1>

            <motion.p {...stagger(0.25)} style={{ ...styles.body, marginBottom: 20 }}>
              Choose what feels closest to your heart.
            </motion.p>

            <motion.div {...stagger(0.3)} style={styles.optionsContainer}>
              {motivationOptions.map((option, idx) => (
                <motion.button
                  key={option}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + idx * 0.05, duration: 0.4 }}
                  style={{
                    ...styles.optionBtn,
                    ...(selectedMotivation === option ? styles.optionSelected : {}),
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={() => { sfxTap(); setSelectedMotivation(option); }}
                >
                  {selectedMotivation === option && (
                    <div style={styles.borderWipeOverlay} />
                  )}
                  {option}
                </motion.button>
              ))}
            </motion.div>

            <div style={styles.actions}>
              <button
                className="btn btn-primary"
                disabled={!selectedMotivation}
                style={!selectedMotivation ? styles.btnDisabled : {}}
                onClick={goNext}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: DAILY GOAL ── */}
        {step === 1 && (
          <motion.div key="goal" style={styles.card} {...scaleBlur}>
            <motion.h1 {...stagger(0.1)} style={styles.headline}>
              How much time feels right?
            </motion.h1>

            <motion.p {...stagger(0.2)} style={styles.body}>
              Start small. You can always adjust later.
            </motion.p>

            <motion.div {...stagger(0.28)} style={styles.goalRow}>
              {goalOptions.map((g) => (
                <GoalCard
                  key={g.value}
                  option={g}
                  isSelected={selectedGoal === g.value}
                  onSelect={setSelectedGoal}
                />
              ))}
            </motion.div>

            <div style={styles.actions}>
              <button
                className="btn btn-primary"
                disabled={!selectedGoal}
                style={!selectedGoal ? styles.btnDisabled : {}}
                onClick={goNext}
              >
                Set my goal
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: CONFIRMATION — "Your journey has started" (full-bleed, warmest screen) ── */}
        {step === 2 && (
          <motion.div key="complete" style={styles.confirmRoot} {...scaleBlur}>
            {/* Subtle geometric dot pattern overlay */}
            <div style={styles.confirmPattern} />

            {/* Largest glow orb in the app — 500px, 7s breathe, sunrise warmth */}
            <div style={styles.confirmGlow} />

            {/* Diamond seal centerpiece */}
            <motion.div
              style={styles.confirmDiamondWrap}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 12 }}
            >
              {/* Breathing gold glow ring behind diamond */}
              <div style={styles.confirmDiamondGlow} />
              <div style={styles.confirmDiamond}>
                <div style={styles.confirmDiamondInner}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline className="checkmark-path" points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Headline — word-by-word, full shimmer */}
            <h1 style={styles.confirmHeadline}>
              <span className="shimmer-text" style={{ fontFamily: "var(--font-heading)" }}>
                {["Your", "journey", "has", "started."].map((word, i) => (
                  <motion.span
                    key={word}
                    style={{ display: "inline-block", marginRight: "0.3em" }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.15, duration: 0.4, ease: [0, 0, 0.2, 1] }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
            </h1>

            {/* Subtext */}
            <motion.p
              style={styles.confirmBody}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.4 }}
            >
              A few sincere minutes each day can take you far.
            </motion.p>

            {/* Emotional closer */}
            <motion.p
              style={styles.confirmCloser}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.4 }}
            >
              Welcome home.
            </motion.p>

            {/* Go to Home — pulsing gold border glow (bookend with Start Lesson 1) */}
            <motion.div
              style={styles.actions}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.4 }}
            >
              <button
                className="btn btn-primary"
                style={{ animation: "pulsingGoldBorder 2.5s ease-in-out infinite" }}
                onClick={handleFinish}
              >
                Go to Home
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

  /* ── Context label ── */
  contextLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "var(--c-accent)",
    marginBottom: 20,
  },

  /* ── Options ── */
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

  /* ── Goal selector ── */
  goalRow: {
    display: "flex",
    gap: 12,
    width: "100%",
    marginBottom: 28,
    justifyContent: "center",
  },
  goalBtn: {
    flex: 1,
    maxWidth: 110,
    padding: "22px 12px 16px",
    borderRadius: 20,
    border: "2px solid var(--c-border)",
    background: "var(--c-bg-card)",
    cursor: "pointer",
    transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    WebkitTapHighlightColor: "transparent",
  },
  goalSelected: {
    borderColor: "var(--c-primary)",
    background: "var(--c-primary-soft)",
    boxShadow: "0 4px 20px rgba(22,51,35,0.12)",
  },
  goalNumber: {
    fontFamily: "var(--font-heading)",
    fontSize: 32,
    fontWeight: 600,
    color: "var(--c-text)",
    lineHeight: 1.1,
  },
  goalUnit: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--c-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  goalDesc: {
    fontSize: 11,
    color: "var(--c-text-muted)",
    marginTop: 6,
    opacity: 0.7,
  },

  /* ── Confirmation (step 2) — full-bleed immersive, warmest screen ── */
  confirmRoot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: "20vh",
    width: "100%",
    minHeight: "calc(100dvh - 64px)",
    position: "relative",
    textAlign: "center",
    background: "linear-gradient(180deg, var(--c-bg-warm) 0%, var(--c-bg) 100%)",
    borderRadius: 0,
    padding: "20vh 28px 36px",
    overflow: "hidden",
  },
  confirmPattern: {
    position: "absolute",
    inset: 0,
    opacity: 0.05,
    backgroundImage: "radial-gradient(circle, var(--c-text-muted) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
    pointerEvents: "none",
  },
  confirmGlow: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, rgba(196,164,100,0.20) 0%, rgba(196,164,100,0.08) 40%, transparent 70%)",
    animation: "glowBreathSlow 7s ease-in-out infinite",
    pointerEvents: "none",
  },
  confirmDiamondWrap: {
    position: "relative",
    width: 100,
    height: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  confirmDiamondGlow: {
    position: "absolute",
    inset: -20,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(196,164,100,0.18) 0%, transparent 70%)",
    animation: "glowBreathSlow 5s ease-in-out infinite",
    pointerEvents: "none",
  },
  confirmDiamond: {
    width: 84,
    height: 84,
    background: "var(--c-primary)",
    borderRadius: 24,
    transform: "rotate(45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 32px rgba(22,51,35,0.15)",
  },
  confirmDiamondInner: {
    transform: "rotate(-45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmHeadline: {
    fontFamily: "var(--font-heading)",
    fontSize: 26,
    fontWeight: 600,
    lineHeight: 1.35,
    color: "var(--c-text)",
    marginBottom: 10,
    letterSpacing: "-0.01em",
  },
  confirmBody: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--c-text-soft)",
    maxWidth: 280,
    marginBottom: 8,
    fontFamily: "var(--font-body)",
  },
  confirmCloser: {
    fontFamily: "var(--font-heading)",
    fontStyle: "italic",
    fontSize: 14,
    color: "var(--c-text-muted)",
    marginBottom: 24,
  },

  btnDisabled: {
    opacity: 0.45,
    pointerEvents: "none",
  },
};
