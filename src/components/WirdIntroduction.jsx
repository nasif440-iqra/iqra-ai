import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfxOnboardingAdvance, sfxOnboardingComplete } from "../lib/audio.js";

const TOTAL_STEPS = 3;

/* ── Inject keyframes ── */
if (typeof document !== "undefined") {
  const id = "wird-intro-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes wirdIntroFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes wirdGlowBreathe {
        0%, 100% { opacity: 0.4; transform: translate(-50%, -60%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -60%) scale(1.08); }
      }
      @keyframes dividerDraw {
        0% { width: 0; opacity: 0; }
        100% { width: 56px; opacity: 1; }
      }
      @keyframes moonFill {
        0% { clip-path: circle(0% at 50% 100%); opacity: 0.2; }
        50% { clip-path: circle(60% at 50% 70%); opacity: 0.7; }
        100% { clip-path: circle(75% at 50% 50%); opacity: 1; }
      }
      @keyframes moonGlow {
        0% { box-shadow: 0 0 0 0 rgba(196,164,100,0); }
        40% { box-shadow: 0 0 40px 12px rgba(196,164,100,0.3); }
        100% { box-shadow: 0 0 20px 6px rgba(196,164,100,0.1); }
      }
      @keyframes moonRingPulse {
        0% { transform: scale(1); opacity: 0.5; border-color: rgba(196,164,100,0.4); }
        100% { transform: scale(1.6); opacity: 0; border-color: rgba(196,164,100,0); }
      }
      @keyframes sparkle {
        0% { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
      }
      @keyframes moonFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
  }
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
              background: i <= current ? "var(--c-accent)" : "transparent",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Word-by-word text reveal ── */
function WordReveal({ text, baseDelay = 0, style }) {
  const words = text.split(" ");
  return (
    <p style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block", marginRight: "0.28em" }}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: baseDelay + i * 0.09,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}

/* ══════════════════════════════════════════════
   Step 1 — Hadith
   ══════════════════════════════════════════════ */
function StepHadith({ onReady }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2500);
    const t2 = setTimeout(() => setPhase(2), 3500);
    const t3 = setTimeout(() => setPhase(3), 4800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div
      style={styles.stepContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
      transition={{ duration: 0.4 }}
    >
      <div style={styles.glowOrb} />

      <WordReveal
        text="The most beloved deeds to Allah are those done consistently, even if they are small."
        baseDelay={0.4}
        style={styles.hadithText}
      />

      <motion.div
        animate={{ width: phase >= 1 ? 56 : 0, opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ ...styles.goldDivider, width: 0, opacity: 0 }}
      />

      <motion.p
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 8 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ ...styles.attribution, opacity: 0 }}
      >
        Prophet Muhammad
      </motion.p>

      <motion.div
        animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.9 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        style={{ textAlign: "center", position: "relative", zIndex: 1, opacity: 0 }}
      >
        <p style={styles.salawat}>{"\uFDFA"}</p>
        <p style={styles.reference}>Sahih al-Bukhari 6464</p>
      </motion.div>

      <motion.div
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 16 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
        style={{ ...styles.actions, opacity: 0 }}
      >
        <button className="btn btn-primary" onClick={onReady}>Continue</button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   Step 2 — What is Wird?
   ══════════════════════════════════════════════ */
function StepMeaning({ onReady }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1600);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => setPhase(3), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div
      style={styles.stepContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        style={styles.arabicWirdWrap}
      >
        <span style={styles.arabicWird}>وِرْد</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
        style={styles.transliteration}
      >
        wird
      </motion.p>

      <motion.div
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ ...styles.meaningBody, opacity: 0 }}
      >
        <p style={styles.meaningParagraph}>
          A <span style={styles.meaningHighlight}>Wird</span> is a daily spiritual practice {"\u2014"} a portion of worship you return to each day, no matter how small.
        </p>
      </motion.div>

      <motion.div
        animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 12 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ ...styles.meaningBody, opacity: 0 }}
      >
        <p style={{ ...styles.meaningParagraph, marginTop: 14 }}>
          In Tila, your Wird is your daily streak. Each day you practice, your Wird grows. It{"\u2019"}s not about perfection {"\u2014"} it{"\u2019"}s about showing up.
        </p>
      </motion.div>

      <motion.div
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 16 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
        style={{ ...styles.actions, opacity: 0 }}
      >
        <button className="btn btn-primary" onClick={onReady}>Continue</button>
      </motion.div>
    </motion.div>
  );
}

/* ── Sparkle particles for moon fill ── */
function MoonSparkles({ show }) {
  if (!show) return null;
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 2 * Math.PI;
    const dist = 30 + Math.random() * 25;
    return {
      sx: `${Math.cos(angle) * dist}px`,
      sy: `${Math.sin(angle) * dist}px`,
      delay: Math.random() * 0.2,
      size: 3 + Math.random() * 3,
    };
  });
  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 5 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            background: "var(--c-accent)",
            borderRadius: "50%",
            "--sx": p.sx,
            "--sy": p.sy,
            animation: `sparkle 0.7s ${p.delay}s ease-out forwards`,
            opacity: 1,
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Step 3 — Your first Wird point
   ══════════════════════════════════════════════ */
function StepFirstWird({ onReady }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);   // moon circle appears
    const t2 = setTimeout(() => setPhase(2), 1600);  // moon fills + sparkles
    const t3 = setTimeout(() => setPhase(3), 3200);  // Day 1 text
    const t4 = setTimeout(() => setPhase(4), 4200);  // subtext + quote
    const t5 = setTimeout(() => setPhase(5), 5400);  // button
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  return (
    <motion.div
      style={styles.stepContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
      transition={{ duration: 0.4 }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        style={styles.wirdHeading}
      >
        A Sacred Daily Practice
      </motion.h2>

      {/* ── Brand mark hero — crescent + arch ── */}
      <div style={{ position: "relative", width: 130, height: 170, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Background glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", inset: -30, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,164,100,0.16) 0%, rgba(196,164,100,0.05) 50%, transparent 70%)", pointerEvents: "none" }}
        />

        {/* Empty state — faint arch outline */}
        <AnimatePresence>
          {phase >= 1 && phase < 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.2, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
              style={{ position: "absolute", inset: 0 }}
            >
              <svg width="130" height="170" viewBox="0 0 130 170" fill="none">
                <path d="M26 158 L26 72 Q26 8 65 2 Q104 8 104 72 L104 158" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.3" strokeDasharray="4 4" />
                <circle cx="65" cy="65" r="30" stroke="var(--c-accent)" strokeWidth="1.5" opacity="0.2" strokeDasharray="3 3" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filled state — brand mark reveals */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <svg width="130" height="170" viewBox="0 0 130 170" fill="none">
            {/* Arch */}
            <path d="M26 158 L26 72 Q26 8 65 2 Q104 8 104 72 L104 158" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M36 158 L36 76 Q36 20 65 12 Q94 20 94 76 L94 158" stroke="var(--c-accent)" strokeWidth="0.8" opacity="0.25" />
            {/* Keystone */}
            <circle cx="65" cy="2" r="3" fill="var(--c-accent)" opacity="0.8" />
            {/* Base dots */}
            <circle cx="26" cy="158" r="1.5" fill="var(--c-accent)" opacity="0.3" />
            <circle cx="104" cy="158" r="1.5" fill="var(--c-accent)" opacity="0.3" />
            {/* Crescent */}
            <circle cx="65" cy="65" r="30" fill="var(--c-accent)" />
            <circle cx="74" cy="56" r="24" fill="var(--c-bg)" />
            {/* Stars */}
            <circle cx="42" cy="34" r="2" fill="var(--c-accent)" opacity="0.4" />
            <circle cx="90" cy="40" r="1.6" fill="var(--c-accent)" opacity="0.35" />
            <circle cx="82" cy="26" r="1.3" fill="var(--c-accent)" opacity="0.3" />
          </svg>
        </motion.div>

        {/* Ring pulse on fill */}
        {phase >= 2 && (
          <div style={{
            position: "absolute", top: 20, left: 10, right: 10, bottom: 40,
            borderRadius: "50%",
            border: "2px solid rgba(196,164,100,0.3)",
            animation: "moonRingPulse 1.2s ease-out forwards",
            pointerEvents: "none",
          }} />
        )}

        {/* Sparkle particles */}
        <MoonSparkles show={phase >= 2} />
      </div>

      {/* Day counter + caption */}
      <motion.div
        animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 14 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: "center", marginBottom: 8, opacity: 0 }}
      >
        <p style={styles.dayCounter}>Day 1</p>
        <p style={styles.dayCaption}>Your Wird has begun</p>
      </motion.div>

      {/* Subtext + quote */}
      <motion.div
        animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 12 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: "center", marginTop: 16, opacity: 0 }}
      >
        <p style={styles.wirdSubtext}>
          Come back tomorrow to keep it growing.
        </p>
        <motion.p
          animate={{ opacity: phase >= 4 ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ ...styles.wirdQuote, opacity: 0 }}
        >
          And whoever holds firmly to Allah has been guided to a straight path.
          <span style={styles.wirdQuoteRef}>{"\u2014"} Quran 3:101</span>
        </motion.p>
      </motion.div>

      {/* Button */}
      <motion.div
        animate={{ opacity: phase >= 5 ? 1 : 0, y: phase >= 5 ? 0 : 16 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
        style={{ ...styles.actions, opacity: 0 }}
      >
        <button
          className="btn btn-primary"
          style={{ animation: phase >= 5 ? "pulsingGoldBorder 2.5s ease-in-out infinite" : "none" }}
          onClick={onReady}
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */
export default function WirdIntroduction({ onComplete }) {
  const [step, setStep] = useState(0);

  const goNext = () => {
    sfxOnboardingAdvance();
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      sfxOnboardingComplete();
      onComplete();
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.progressContainer}>
        <ProgressBar current={step} total={TOTAL_STEPS} />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && <StepHadith key="hadith" onReady={goNext} />}
        {step === 1 && <StepMeaning key="meaning" onReady={goNext} />}
        {step === 2 && <StepFirstWird key="firstWird" onReady={goNext} />}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════ */
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
  stepContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: "15vh",
    textAlign: "center",
    width: "100%",
    maxWidth: 360,
    position: "relative",
  },
  actions: {
    width: "100%",
    marginTop: 32,
  },

  /* ── Step 1: Hadith ── */
  glowOrb: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    background: "radial-gradient(circle, rgba(196,164,100,0.14) 0%, rgba(196,164,100,0.04) 50%, transparent 70%)",
    animation: "wirdGlowBreathe 5s ease-in-out infinite",
    pointerEvents: "none",
  },
  hadithText: {
    fontFamily: "var(--font-heading)",
    fontSize: 22,
    fontWeight: 400,
    fontStyle: "italic",
    lineHeight: 1.55,
    color: "var(--c-text)",
    maxWidth: 320,
    position: "relative",
    zIndex: 1,
  },
  goldDivider: {
    height: 2,
    background: "linear-gradient(90deg, transparent, var(--c-accent), transparent)",
    borderRadius: 1,
    margin: "22px 0 18px",
    position: "relative",
    zIndex: 1,
    width: 0,
    opacity: 0,
  },
  attribution: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--c-text-muted)",
    fontStyle: "normal",
    position: "relative",
    zIndex: 1,
    marginBottom: 4,
  },
  salawat: {
    fontFamily: "'Amiri', 'Traditional Arabic', serif",
    fontSize: 42,
    lineHeight: 1.2,
    color: "var(--c-accent)",
    margin: "4px 0 8px",
  },
  reference: {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--c-text-muted)",
    opacity: 0.6,
    marginTop: 4,
    fontStyle: "italic",
  },

  /* ── Step 2: Meaning ── */
  arabicWirdWrap: {
    marginBottom: 8,
  },
  arabicWird: {
    fontFamily: "'Amiri', 'Traditional Arabic', serif",
    fontSize: 72,
    color: "var(--c-text)",
    lineHeight: 1.3,
    display: "block",
  },
  transliteration: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--c-accent)",
    letterSpacing: "0.08em",
    textTransform: "lowercase",
    marginBottom: 24,
  },
  meaningBody: {
    maxWidth: 320,
  },
  meaningParagraph: {
    fontSize: 15,
    lineHeight: 1.65,
    color: "var(--c-text-soft)",
  },
  meaningHighlight: {
    fontWeight: 700,
    color: "var(--c-accent)",
  },

  /* ── Step 3: First Wird ── */
  wirdHeading: {
    fontFamily: "var(--font-heading)",
    fontSize: 22,
    fontWeight: 600,
    color: "var(--c-text)",
    marginBottom: 28,
  },
  heroMoonGlow: {
    position: "absolute",
    inset: -24,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(196,164,100,0.18) 0%, rgba(196,164,100,0.06) 50%, transparent 70%)",
    pointerEvents: "none",
  },
  heroMoonEmpty: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "var(--c-bg-card)",
    border: "2.5px dashed rgba(196,164,100,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)",
  },
  heroMoonFilled: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "var(--c-accent-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    clipPath: "circle(0% at 50% 100%)",
    opacity: 0,
    animation: "moonFloat 4s ease-in-out 2.5s infinite",
  },
  dayCounter: {
    fontFamily: "var(--font-heading)",
    fontSize: 28,
    fontWeight: 700,
    color: "var(--c-accent)",
    lineHeight: 1.2,
  },
  dayCaption: {
    fontSize: 14,
    color: "var(--c-text-soft)",
    marginTop: 4,
  },
  wirdSubtext: {
    fontSize: 14,
    color: "var(--c-text-soft)",
    lineHeight: 1.5,
  },
  wirdQuote: {
    fontFamily: "var(--font-heading)",
    fontSize: 14,
    fontStyle: "italic",
    color: "var(--c-text-muted)",
    marginTop: 10,
  },
  wirdQuoteRef: {
    display: "block",
    fontSize: 11,
    fontStyle: "normal",
    marginTop: 4,
    opacity: 0.7,
  },
};
