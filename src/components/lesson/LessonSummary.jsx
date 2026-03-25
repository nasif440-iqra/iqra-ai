import { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import { useMotionValue, animate } from "framer-motion";
import { LESSONS } from "../../data/lessons.js";
import { getLetter } from "../../data/letters.js";
import { sfxTap } from "../../lib/audio.js";
import { Icons } from "../Icons.jsx";
import { pickCopy, getCompletionTier, getSummaryMessaging, COMPLETION_HEADLINES, COMPLETION_SUBLINES, CLOSING_QUOTES } from "../../lib/engagement.js";

export default function LessonSummary({ lesson, lessonId, teachLetters, lessonCombos, quizResults, speakResults, lessonsCompleted, isHarakatIntro, isHarakatApplied, onComplete, onBack, onStartSpeak, speakingEnabled }) {
  const qC = quizResults.filter(r => r.correct).length;
  const qT = quizResults.length;
  const qP = qT > 0 ? Math.round((qC / qT) * 100) : 0;
  const isCheckpoint = lesson.lessonMode === "checkpoint";
  const isReview = lesson.lessonMode === "review";

  // Animated accuracy counter
  const motionPct = useMotionValue(0);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const unsubscribe = motionPct.on("change", v => setDisplayPct(Math.round(v)));
    const timers = [];

    // Confetti for accuracy >= 70
    if (qP >= 70) {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#163323", "#C4A464", "#255038", "#F5EDDB", "#EBE6DC"],
        scalar: 0.9,
        gravity: 1.1,
      });

      // Double burst for perfect score
      if (qP === 100) {
        timers.push(setTimeout(() => {
          confetti({
            particleCount: 40,
            spread: 55,
            origin: { y: 0.4, x: 0.3 },
            colors: ["#C4A464", "#163323"],
            scalar: 0.8,
          });
          confetti({
            particleCount: 40,
            spread: 55,
            origin: { y: 0.4, x: 0.7 },
            colors: ["#C4A464", "#163323"],
            scalar: 0.8,
          });
        }, 400));
      }
    }

    // Count-up animation with 200ms delay
    timers.push(setTimeout(() => {
      animate(motionPct, qP, { duration: 0.8, ease: "easeOut" });
    }, 200));

    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, []);

  // ── Checkpoint / Review summary ──
  if (isCheckpoint || isReview) {
    // Compute per-letter accuracy from this session
    const letterStats = {};
    for (const r of quizResults) {
      if (!letterStats[r.targetId]) letterStats[r.targetId] = { correct: 0, total: 0 };
      letterStats[r.targetId].total++;
      if (r.correct) letterStats[r.targetId].correct++;
    }

    const strongLetters = [];
    const needsPractice = [];
    for (const [id, stats] of Object.entries(letterStats)) {
      const letter = getLetter(parseInt(id, 10));
      if (!letter) continue;
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      if (accuracy >= 80) {
        strongLetters.push(letter);
      } else {
        needsPractice.push(letter);
      }
    }

    const next = typeof lesson.id === "number" ? LESSONS.find(l => l.id === lesson.id + 1) : null;

    return (
      <div className="screen" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div className="noor-reveal" style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,164,100,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ animation: "subtleLift 0.5s ease both", position: "relative", zIndex: 1 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-primary-soft)", border: "3px solid var(--c-primary)", animation: "scaleIn 0.5s ease both" }}>
            <Icons.Check size={32} color="var(--c-primary)" />
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, marginBottom: 6, color: "var(--c-text)" }}>
            {isCheckpoint ? "Checkpoint Complete" : "Review Complete"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--c-text-muted)", marginBottom: 16 }}>{qC}/{qT} correct</p>
        </div>

        {/* Mastery breakdown */}
        <div style={{ width: "100%", marginTop: 8, padding: "16px", borderRadius: 16, background: "var(--c-bg-card)", border: "1px solid var(--c-border)", animationDelay: "0.15s" }}>
          {strongLetters.length > 0 && (
            <div style={{ marginBottom: needsPractice.length > 0 ? 16 : 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Strong</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {strongLetters.map(l => (
                  <span key={l.id} style={{ fontFamily: "var(--font-arabic)", fontSize: 24, color: "var(--c-primary)", background: "var(--c-primary-soft)", width: 40, height: 40, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} dir="rtl">{l.letter}</span>
                ))}
              </div>
            </div>
          )}
          {needsPractice.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Needs practice</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {needsPractice.map(l => (
                  <span key={l.id} style={{ fontFamily: "var(--font-arabic)", fontSize: 24, color: "var(--c-accent)", background: "rgba(196,164,100,0.1)", width: 40, height: 40, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} dir="rtl">{l.letter}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p style={{ fontSize: 13, color: "var(--c-text-soft)", marginTop: 16, lineHeight: 1.5, maxWidth: 280, margin: "16px auto 0" }}>
          {needsPractice.length > 0
            ? "Keep revisiting the gold ones \u2014 they'll click with practice."
            : "All letters looking strong \u2014 great work."}
        </p>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 24, animation: "subtleLift 0.4s ease 0.4s both" }}>
          <button className="btn btn-primary" onClick={() => { sfxTap(); onComplete(lessonId, quizResults, speakResults); }} style={{ position: "relative", overflow: "hidden" }}>
            <span>Continue</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
          </button>
          <button className="btn btn-ghost" onClick={() => { sfxTap(); onBack(); }}>Back to Home</button>
        </div>
      </div>
    );
  }

  // ── Regular lesson summary ──
  const isFirst = lessonsCompleted === 0 && lesson.id === 1;
  const next = LESSONS.find(l => l.id === lesson.id + 1);
  const nextL = next ? (next.teachIds || []).map(id => getLetter(id)) : [];
  const tier = getCompletionTier(qP, isFirst, isHarakatApplied);
  const headline = COMPLETION_HEADLINES[tier];
  const subline = COMPLETION_SUBLINES[tier];
  const { sectionHeading, recap } = getSummaryMessaging(lesson, teachLetters, lessonCombos, qP);
  const isSound = lesson.lessonMode === "sound";
  const isContrast = lesson.lessonMode === "contrast";
  const nextHints = next ? [
    next.lessonMode === "harakat-intro" ? "Learn how vowel marks change letter sounds" :
    next.lessonMode === "harakat" ? "Practice vowels on letters you know" :
    next.lessonMode === "harakat-mixed" ? "Mix all three vowel marks together" :
    next.teachIds.length >= 2 ? "Same shape, different details" : "A new letter to discover",
    next.lessonMode === "sound" ? "Listen and learn how it sounds" : "See if you can spot the difference",
    "This builds on what you just learned"
  ] : [];
  const nextHint = useMemo(() => next ? pickCopy(nextHints) : "", [next?.id]);

  return (
    <div className="screen" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div className="noor-reveal" style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,164,100,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ animation: "subtleLift 0.5s ease both", position: "relative", zIndex: 1 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: qP === 100 ? "var(--c-primary-soft)" : qP >= 70 ? "rgba(196,164,100,0.08)" : "var(--c-bg)", border: `3px solid ${qP === 100 ? "var(--c-primary)" : qP >= 70 ? "var(--c-accent)" : "var(--c-border)"}`, animation: "scaleIn 0.5s ease both" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700, color: qP === 100 ? "var(--c-primary)" : qP >= 70 ? "var(--c-accent)" : "var(--c-text-soft)" }}>{displayPct}%</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600, marginBottom: 6, color: "var(--c-text)" }}>{headline}</h1>
        <p style={{ fontSize: 14, color: "var(--c-text-soft)", marginBottom: 8, maxWidth: 280, margin: "0 auto 8px", lineHeight: 1.5 }}>{subline}</p>
        <p style={{ fontSize: 13, color: "var(--c-text-muted)", marginBottom: 4 }}>{(isHarakatIntro ? "Fatha \u00B7 Kasra \u00B7 Damma" : isHarakatApplied ? lessonCombos.map(c => c.display).join(" \u00B7 ") : teachLetters.map(l => l.name).join(" \u00B7 ")) + " \u2014 " + qC + "/" + qT + " correct"}</p>
        {(isSound || isContrast) && <p style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 600 }}>{isContrast ? "Contrast lesson complete" : "Listening lesson complete"}</p>}
        {isHarakatIntro && <p style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 600 }}>You now know the three short vowel marks</p>}
        {isHarakatApplied && lesson.id === 83 && <p style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 600 }}>You can read letters with all three vowels {"\u2014"} that{"\u2019"}s real Quran reading</p>}
        {isHarakatApplied && lesson.id !== 83 && <p style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 600 }}>{qP >= 70 ? "You matched marks to sounds \u2014 that\u2019s reading" : "Keep practicing \u2014 the sounds will click"}</p>}
      </div>

      <div className="lesson-recap" style={{ width: "100%", marginTop: 16, padding: "12px 16px", borderRadius: 16, background: "var(--c-primary-soft)", border: "1px solid rgba(22,51,35,0.08)", textAlign: "center", animationDelay: "0.15s" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--c-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{sectionHeading}</p>
        <p style={{ fontSize: 13, color: "var(--c-primary-dark)", lineHeight: 1.5 }}>{recap}</p>
      </div>

      {speakingEnabled && lesson.hasSpeaking && teachLetters.length > 0 && speakResults.length === 0 && onStartSpeak && (
        <div style={{ width: "100%", marginTop: 12, animation: "subtleLift 0.4s ease 0.2s both" }}>
          <button className="btn btn-outline" onClick={onStartSpeak} style={{ width: "100%" }}>
            {"\uD83C\uDF99\uFE0F"} Practice pronunciation
          </button>
        </div>
      )}

      {next && (
        <div style={{ width: "100%", marginTop: 16, marginBottom: 12, padding: "18px 20px", borderRadius: 24, background: "var(--c-bg-warm)", border: "1px solid var(--c-border)", textAlign: "center", animation: "subtleLift 0.5s ease 0.25s both", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,164,100,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Up next</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 4 }}>{nextL.slice(0, 3).map(l => <span key={l.id} style={{ fontFamily: "var(--font-arabic)", fontSize: 28, color: "var(--c-primary-dark)", opacity: 0.7, lineHeight: 1.4 }}>{l.letter}</span>)}</div>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{next.title}</p>
          <p style={{ fontSize: 12, color: "var(--c-primary)", fontWeight: 600, marginTop: 4 }}>{nextHint}</p>
        </div>
      )}

      <div style={{ marginBottom: 12, animation: "subtleLift 0.4s ease 0.35s both" }}><p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--c-text-soft)", fontStyle: "italic", maxWidth: 280, margin: "0 auto" }}>"{CLOSING_QUOTES[lesson.id % CLOSING_QUOTES.length]}"</p></div>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, animation: "subtleLift 0.4s ease 0.4s both" }}>
        <button className="btn btn-primary" onClick={() => { sfxTap(); onComplete(lessonId, quizResults, speakResults); }} style={{ position: "relative", overflow: "hidden" }}>
          {next ? <><span>Continue</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14m-7-7l7 7-7 7" /></svg></> : "Finish"}
        </button>
        <button className="btn btn-ghost" onClick={() => { sfxTap(); onBack(); }}>Back to Home</button>
      </div>
    </div>
  );
}
