import { motion } from "framer-motion";
import { LESSONS } from "../data/lessons.js";
import { getLetter } from "../data/letters.js";
import { sfxTap, sfxNodeTap, sfxLessonStart } from "../lib/audio.js";
import { Icons } from "./Icons.jsx";
import { pickCopy, CONTINUATION_COPY } from "../lib/engagement.js";
import { getPhaseMomentumCopy, isLessonUnlocked } from "../lib/progress.js";
import { getCurrentUnlockedLesson, getLearnedLetterIds, getPhaseCounts, getDueLetters, planReviewSession } from "../lib/selectors.js";
import { getTodayDateString } from "../lib/progress.js";

/* ── serpentine x-offsets that repeat every 6 nodes ── */
const OFFSETS = [4, 16, 8, -4, -12, 0];

function getPersonalizedCopy(onboardingData) {
  if (!onboardingData) return null;
  const { onboardingStartingPoint, onboardingMotivation } = onboardingData;

  // Motivation-based copy takes priority if available
  if (onboardingMotivation) {
    if (onboardingMotivation.includes("prayer")) return "A few sincere minutes can strengthen your reading and your prayer.";
    if (onboardingMotivation.includes("reconnect")) return "Returning is a beginning too.";
    if (onboardingMotivation.includes("habit")) return "Small and steady — that's the path.";
    if (onboardingMotivation.includes("child") || onboardingMotivation.includes("family")) return "Learning together is a beautiful thing.";
    if (onboardingMotivation.includes("confidently")) return "Every letter you learn brings you closer.";
  }

  // Fall back to starting-point copy
  if (onboardingStartingPoint) {
    if (onboardingStartingPoint === "I'm completely new") return "Starting from zero is okay. You're building one letter at a time.";
    if (onboardingStartingPoint.includes("forgot")) return "You're rebuilding, not starting over.";
    if (onboardingStartingPoint.includes("few letters")) return "You already have a foundation. Let's build on it.";
    if (onboardingStartingPoint.includes("read a little")) return "Strengthening your basics will make everything easier.";
  }

  return null;
}

export default function HomeScreen({ progress, mastery, completedLessonIds, lessonsCompleted, lastCompletedLesson, onStartLesson, currentWird, todayLessonCount, dailyGoal, onboardingData }) {
  const learnedIds = getLearnedLetterIds(completedLessonIds);
  const dailyGoalNum = dailyGoal ?? 1;
  const today = getTodayDateString();
  const dueLetters = getDueLetters(progress, today);
  const reviewPlan = mastery ? planReviewSession(mastery, today) : null;

  /* ── Zeigarnik momentum copy ── */
  const momentumCopy = getPhaseMomentumCopy(completedLessonIds);
  const isComplete = (lesson) => completedLessonIds.includes(lesson.id);

  /* ── phase stats ── */
  const { p1Done, p2Done, p3Done } = getPhaseCounts(completedLessonIds);

  /* ── greeting (unchanged logic) ── */
  const greetingSubtitle = lessonsCompleted === 0
    ? "Continue your\njourney"
    : lessonsCompleted === 1 ? "You've started\nlearning Quran"
    : p2Done > 0 ? `Listening and learning`
    : learnedIds.length < 10 ? `${learnedIds.length} letters down`
    : `${learnedIds.length} letters and growing`;

  /* ── find the current (next uncompleted + unlocked) lesson ── */
  const currentLesson = getCurrentUnlockedLesson(completedLessonIds);
  const allDone = !currentLesson || completedLessonIds.length >= LESSONS.length;
  const currentIdx = currentLesson ? LESSONS.findIndex(l => l.id === currentLesson.id) : LESSONS.length - 1;
  const heroLetters = currentLesson ? (currentLesson.teachIds || []).map(id => getLetter(id)).filter(Boolean) : [];
  const heroLetter = heroLetters[0];

  /* ── windowed view: all completed + current + up to 4 locked preview ── */
  const windowStart = 0;
  let lockedCount = 0;
  let windowEnd = 0;
  for (let i = 0; i < LESSONS.length; i++) {
    const l = LESSONS[i];
    const done = completedLessonIds.includes(l.id);
    const isCurrent = l.id === currentLesson.id;
    if (done || isCurrent) {
      windowEnd = i + 1;
      lockedCount = 0;
    } else {
      lockedCount++;
      windowEnd = i + 1;
      if (lockedCount >= 4) break;
    }
  }
  const windowLessons = LESSONS.slice(windowStart, windowEnd);

  /* ── phase labels to inject ── */
  const phaseLabels = { 1: "Letter Recognition", 2: "Letter Sounds", 3: "Harakat (Vowels)" };

  /* ── track which phases we've already labelled ── */
  const seenPhases = new Set();

  return (
    <div className="screen pattern-bg" style={{ paddingBottom: 100 }}>
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--c-text)" }}>Tila</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Daily goal */}
            {dailyGoalNum > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 999, border: "1px solid var(--c-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 500 }}>Today</span>
                <span style={{ fontSize: 12, color: "var(--c-text)", fontWeight: 600 }}>{Math.min(todayLessonCount || 0, dailyGoalNum)}/{dailyGoalNum}</span>
              </div>
            )}
            {/* Wird */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 12px", borderRadius: 999, border: "1px solid var(--c-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize: 14, color: "var(--c-accent)", lineHeight: 1 }}>☽</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{currentWird || 0}</span>
              <span style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 500 }}>Wird</span>
            </div>
          </div>
        </div>

        {/* ── Greeting ── */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.15em" }}>Assalamu Alaikum</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 400, lineHeight: 1.15, color: "var(--c-text)", whiteSpace: "pre-line" }}>{greetingSubtitle}</h2>
          {(() => {
            const personalCopy = getPersonalizedCopy(onboardingData);
            if (!personalCopy || lessonsCompleted > 5) return null;
            return <p style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>{personalCopy}</p>;
          })()}
        </div>

        {/* ── Hero Card ── */}
        {!allDone && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.15 }} style={{ marginBottom: 40 }}>
            <div style={{
              background: "var(--c-bg-card)", borderRadius: 32, padding: 24,
              boxShadow: "0 12px 40px rgba(22,51,35,0.06)", border: "1px solid var(--c-border)",
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              position: "relative", overflow: "hidden"
            }}>
              {/* decorative corner blobs */}
              <div style={{ position: "absolute", top: 0, right: 0, width: 128, height: 128, background: "var(--c-bg)", borderBottomLeftRadius: "100%", opacity: 0.5, marginRight: -40, marginTop: -40 }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, width: 96, height: 96, background: "rgba(196,164,100,0.05)", borderTopRightRadius: "100%", marginLeft: -32, marginBottom: -32 }} />

              {/* letter circle with Noor companion glow */}
              <div style={{
                position: "relative", zIndex: 1,
                width: 112, height: 112, borderRadius: "50%",
                background: "#F2F5F3", border: "2px solid white",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20
              }}>
                {/* Noor glow behind the letter circle */}
                <div className="noor-glow" style={{ width: 160, height: 160, top: -24, left: -24 }} />
                <span style={{ fontFamily: "var(--font-arabic)", fontSize: 64, color: "var(--c-text)", lineHeight: 1, marginTop: 8, position: "relative", zIndex: 1 }} dir="rtl">
                  {heroLetter ? heroLetter.letter : "?"}
                </span>
              </div>

              {/* lesson info */}
              <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
                <span style={{
                  display: "inline-block", background: "var(--c-bg)", color: "var(--c-accent)",
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                  padding: "4px 12px", borderRadius: 999, marginBottom: 12
                }}>Lesson {currentLesson.id}</span>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 600, color: "var(--c-text)", marginBottom: 8 }}>
                  {currentLesson.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--c-text-muted)", lineHeight: 1.6, marginBottom: 32, padding: "0 8px" }}>
                  {currentLesson.description}
                </p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => { sfxLessonStart(); onStartLesson(currentLesson.id); }} style={{
                  width: "100%", background: "var(--c-primary)", color: "white",
                  borderRadius: 16, padding: "16px 24px", border: "none",
                  fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: "0 4px 16px rgba(22,51,35,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}>
                  <span>{isComplete(currentLesson) ? "Review Lesson" : completedLessonIds.length > 0 ? "Continue Lesson" : "Start Lesson"}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Smart Review Card ── */}
        {(reviewPlan?.hasReviewWork || dueLetters.length > 0) && (() => {
          const itemCount = reviewPlan?.totalItems || dueLetters.length;
          const hasWeak = reviewPlan?.weak?.length > 0;
          const hasConfused = reviewPlan?.confused?.length > 0;
          const subtitle = hasWeak && hasConfused
            ? `${itemCount} items — includes weak & confused letters`
            : hasWeak
            ? `${itemCount} items — some letters need extra practice`
            : hasConfused
            ? `${itemCount} items — practicing tricky pairs`
            : `${itemCount} letter${itemCount !== 1 ? "s" : ""} ready for practice`;
          return (
            <div className="fade-up" style={{ marginBottom: 20, animationDelay: "0.12s" }}>
              <div style={{
                background: "var(--c-bg-card)", borderRadius: 20, padding: "16px 20px",
                boxShadow: "0 4px 16px rgba(22,51,35,0.04)", border: "1px solid var(--c-border)",
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{"\u263D"}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Review due</p>
                  <p style={{ fontSize: 12, color: "var(--c-text-muted)", margin: "2px 0 0" }}>{subtitle}</p>
                </div>
                <button
                  onClick={() => { sfxNodeTap(); onStartLesson("review"); }}
                  style={{
                    background: "transparent", color: "var(--c-primary)",
                    borderRadius: 12, padding: "10px 16px", border: "1.5px solid var(--c-primary)",
                    fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                  }}
                >
                  Start review →
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Momentum copy (Zeigarnik) ── */}
        {momentumCopy && (
          <div className="fade-up" style={{
            marginBottom: 28, animationDelay: "0.15s",
            background: "var(--c-accent-light)", borderLeft: "3px solid var(--c-accent)",
            borderRadius: "0 12px 12px 0", padding: "14px 16px",
          }}>
            <p style={{ fontSize: 14, color: "var(--c-text-soft)", lineHeight: 1.5, marginBottom: 3 }}>
              <span style={{ color: "var(--c-accent)", marginRight: 6, fontSize: 12 }}>✦</span>{momentumCopy.line1}
            </p>
            <p style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.5, paddingLeft: 18 }}>{momentumCopy.line2}</p>
          </div>
        )}

        {/* ── Journey Path ── */}
        <div className="fade-up" style={{ position: "relative", padding: "0 32px 32px", marginTop: 16, animationDelay: "0.2s" }}>

          {/* SVG winding connector line */}
          <svg style={{
            position: "absolute", top: 20, bottom: 20, left: 44, width: 40,
            height: "calc(100% - 40px)", zIndex: 0, pointerEvents: "none"
          }} preserveAspectRatio="none" viewBox="0 0 40 100" fill="none">
            {/* background dashed path */}
            <path d="M20 0 C 40 20, 40 30, 20 50 C 0 70, 0 80, 20 100"
              stroke="var(--c-border)" strokeWidth="2.5"
              vectorEffect="non-scaling-stroke" strokeLinecap="round"
              strokeDasharray="6 6" />
            {/* solid completed portion */}
            {currentIdx > windowStart && (
              <path d="M20 0 C 40 20, 40 30, 20 50"
                stroke="var(--c-primary)" strokeWidth="2.5"
                vectorEffect="non-scaling-stroke" strokeLinecap="round"
                style={{ opacity: Math.min(1, (currentIdx - windowStart) / windowLessons.length) }} />
            )}
          </svg>

          {/* nodes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 44, position: "relative", zIndex: 1, paddingTop: 8, paddingBottom: 8 }}>
            {windowLessons.map((lesson, i) => {
              const complete = isComplete(lesson);
              const isCurrent = lesson.id === currentLesson.id;
              const globalIdx = windowStart + i;
              const unlocked = isLessonUnlocked(globalIdx, completedLessonIds);
              const locked = !complete && !isCurrent && !unlocked;
              const letters = (lesson.teachIds || []).map(id => getLetter(id));
              const firstLetter = letters[0];
              const offset = OFFSETS[i % OFFSETS.length];
              const showPhaseLabel = !seenPhases.has(lesson.phase);
              if (showPhaseLabel) seenPhases.add(lesson.phase);

              return (
                <div key={lesson.id}>
                  {/* phase divider */}
                  {showPhaseLabel && i > 0 && (
                    <div style={{ marginBottom: 20, marginLeft: -8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.12em", color: "var(--c-text-muted)",
                        background: "var(--c-bg)", padding: "4px 10px", borderRadius: 8
                      }}>Phase {lesson.phase} &middot; {phaseLabels[lesson.phase]}</span>
                    </div>
                  )}

                  {/* node row */}
                  <div
                    onClick={() => { if (!locked) { sfxNodeTap(); onStartLesson(lesson.id); } }}
                    style={{
                      display: "flex", alignItems: "center", gap: 20,
                      transform: `translateX(${offset}px)`,
                      opacity: locked ? 0.4 : complete ? 0.85 : 1,
                      filter: locked ? "grayscale(20%)" : "none",
                      cursor: (complete || isCurrent) ? "pointer" : "default",
                      transition: "transform 0.2s ease"
                    }}
                  >
                    {/* circle node */}
                    {complete ? (
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: "var(--c-primary)", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(22,51,35,0.15)",
                        outline: "4px solid var(--c-bg)"
                      }}>
                        <div style={{ animation: "settledCheck 0.4s ease both" }}>
                          <Icons.Check size={16} color="var(--c-accent)" />
                        </div>
                      </div>
                    ) : isCurrent ? (
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "var(--c-bg-card)", border: "2.5px solid var(--c-primary)",
                        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0 18px rgba(22,51,35,0.12)",
                        outline: "4px solid var(--c-bg)",
                        position: "relative",
                        transition: "all 0.3s ease"
                      }}>
                        {/* Noor companion glow on active lesson */}
                        <div className="noor-glow" style={{ width: 80, height: 80, top: -18, left: -18 }} />
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--c-primary)", position: "relative", zIndex: 1 }} />
                        {/* breathing ring */}
                        <div style={{
                          position: "absolute", inset: -4, borderRadius: "50%",
                          border: "1.5px solid var(--c-primary)", opacity: 0.25,
                          animation: "noorBreath 4s ease-in-out infinite"
                        }} />
                      </div>
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: "var(--c-bg)", border: "2px solid var(--c-border)",
                        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        outline: "4px solid var(--c-bg)",
                        transition: "opacity 0.3s ease"
                      }}>
                        {firstLetter ? (
                          <span style={{ fontFamily: "var(--font-arabic)", fontSize: 18, color: "var(--c-text-muted)", lineHeight: 1, marginTop: 4 }} dir="rtl">{firstLetter.letter}</span>
                        ) : (
                          <Icons.Lock size={14} color="var(--c-text-muted)" />
                        )}
                      </div>
                    )}

                    {/* label */}
                    {isCurrent ? (
                      <div style={{
                        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        padding: "10px 16px", borderRadius: 16,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        border: "1px solid rgba(235,230,220,0.6)",
                        animation: "subtleLift 0.5s ease both"
                      }}>
                        <h5 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>{lesson.title}</h5>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-accent)", animation: "noorBreath 3s ease-in-out infinite" }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Up next</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h5 style={{ fontSize: 15, fontWeight: 500, color: locked ? "var(--c-text-muted)" : "var(--c-text)", margin: 0 }}>{lesson.title}</h5>
                        <p style={{ fontSize: 12, color: locked ? "#A39E93" : "var(--c-text-muted)", marginTop: 2 }}>
                          {complete ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icons.Check size={10} color="var(--c-primary)" /> Completed</span> : locked ? "Locked" : "Available"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
