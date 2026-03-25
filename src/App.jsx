import { useState, useCallback, useRef, useEffect } from "react";
import useIqraAppState from "./hooks/useIqraAppState.js";
import OnboardingScreen from "./components/OnboardingScreen.jsx";
import PostLessonOnboarding from "./components/PostLessonOnboarding.jsx";
import HomeScreen from "./components/HomeScreen.jsx";
import LessonScreen from "./components/lesson/LessonScreen.jsx";
import LessonErrorBoundary from "./components/lesson/LessonErrorBoundary.jsx";
import ProgressScreen from "./components/ProgressScreen.jsx";
import PhaseCompleteScreen from "./components/PhaseCompleteScreen.jsx";
import ReturnHadithScreen from "./components/ReturnHadithScreen.jsx";
import { Icons } from "./components/Icons.jsx";
import { getDailyGoal, buildReviewLessonPayload } from "./lib/selectors.js";
import { getTodayDateString } from "./lib/progress.js";
import { unlockAudio, preloadAudio, sfxTransition } from "./lib/audio.js";

export default function App() {
  const {
    progress,
    mastery,
    completedLessonIds,
    lessonsCompleted,
    lastCompletedLesson,
    wirdState,
    phaseCompleteData,
    initialScreen,
    hasCompletedOnboarding,
    onboardingData,
    saveFailed,
    handleLessonComplete: onLessonComplete,
    handlePhaseCompleteContinue: onPhaseCompleteContinue,
    handleDismissHadith: onDismissHadith,
    handleOnboardingComplete: onOnboardingComplete,
    handlePostLessonOnboardingComplete: onPostLessonComplete,
  } = useIqraAppState();

  const [screen, setScreenRaw] = useState(initialScreen);
  const [currentLessonId, setCurrentLessonId] = useState(null);

  // Derive activeTab from screen — eliminates desync risk
  const activeTab = screen === "progress" ? "progress" : "home";

  // ── Hash-based routing for browser back button ──
  const suppressHashSync = useRef(false);

  // Push hash when screen changes
  useEffect(() => {
    if (suppressHashSync.current) {
      suppressHashSync.current = false;
      return;
    }
    const hash = screen === "home" ? "" : screen;
    const current = window.location.hash.replace("#", "");
    if (current !== hash) {
      if (hash) {
        window.history.pushState(null, "", `#${hash}`);
      } else {
        window.history.pushState(null, "", window.location.pathname);
      }
    }
  }, [screen]);

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash.replace("#", "") || "home";
      // Only navigate to safe screens on back — don't re-enter transient states
      const safeScreens = ["home", "progress", "lesson"];
      if (safeScreens.includes(hash)) {
        suppressHashSync.current = true;
        setScreenRaw(hash);
      } else {
        // For any other hash (phaseComplete, postLessonOnboarding, etc.), go home
        suppressHashSync.current = true;
        setScreenRaw("home");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Wrapper: all screen changes go through this
  const setScreen = useCallback((s) => setScreenRaw(s), []);

  const hasUnlocked = useRef(false);
  const handleFirstTouch = () => {
    if (!hasUnlocked.current) {
      unlockAudio();
      preloadAudio();
      hasUnlocked.current = true;
    }
  };

  // Pre-lesson onboarding complete: mark onboarded, then start Lesson 1
  const handleOnboard = useCallback(({ startingPoint }) => {
    onOnboardingComplete({ startingPoint });
  }, [onOnboardingComplete]);

  // Called from OnboardingScreen's "Start Lesson 1" button
  const handleStartLesson1FromOnboarding = useCallback(() => {
    sfxTransition();
    setCurrentLessonId(1);
    setScreen("lesson");
  }, []);

  // Post-lesson onboarding complete
  const handlePostLessonComplete = useCallback(({ motivation, dailyGoal }) => {
    onPostLessonComplete({ motivation, dailyGoal });
    sfxTransition();
    setScreen("home");
  }, [onPostLessonComplete]);

  const handleStartLesson = useCallback((id) => { sfxTransition(); setCurrentLessonId(id); setScreen("lesson"); }, []);
  const handleGoHome = useCallback(() => { sfxTransition(); setScreen("home"); }, []);

  const handleLessonComplete = useCallback((lessonId, quizResults, speakResults) => {
    const hasPhaseIntercept = onLessonComplete(lessonId, quizResults, speakResults);

    // After completing Lesson 1 for the first time, route to post-lesson onboarding
    // if commitment flow hasn't been completed yet
    if (lessonId === 1 && !onboardingData.onboardingCommitmentComplete) {
      setScreen("postLessonOnboarding");
      return;
    }

    if (hasPhaseIntercept) {
      setScreen("phaseComplete");
    } else {
      setScreen("home");
    }
  }, [onLessonComplete, onboardingData.onboardingCommitmentComplete]);

  const handleDismissHadith = useCallback(() => {
    onDismissHadith();
    setScreen("home");
  }, [onDismissHadith]);

  const handlePhaseCompleteContinue = useCallback(() => {
    onPhaseCompleteContinue();
    setScreen("home");
  }, [onPhaseCompleteContinue]);

  if (!hasCompletedOnboarding) return (
    <div className="app-shell" onPointerDownCapture={handleFirstTouch} onTouchStartCapture={handleFirstTouch}>
      <OnboardingScreen
        onComplete={handleOnboard}
        onStartLesson1={handleStartLesson1FromOnboarding}
      />
    </div>
  );

  return (
    <div className="app-shell" onPointerDownCapture={handleFirstTouch} onTouchStartCapture={handleFirstTouch}>
      {saveFailed && (
        <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 200, padding: "8px 16px", background: "var(--c-danger)", color: "white", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
          Your progress could not be saved. Please export a backup from the Progress screen.
        </div>
      )}
      {screen === "postLessonOnboarding" && <PostLessonOnboarding onComplete={handlePostLessonComplete} />}
      {screen === "returnHadith" && <ReturnHadithScreen onContinue={handleDismissHadith} />}
      {screen === "phaseComplete" && phaseCompleteData && <PhaseCompleteScreen phase={phaseCompleteData} nextPhase={phaseCompleteData.nextPhase} onContinue={handlePhaseCompleteContinue} wird={wirdState.currentWird} />}
      {screen === "home" && <HomeScreen progress={progress} mastery={mastery} completedLessonIds={completedLessonIds} lessonsCompleted={lessonsCompleted} lastCompletedLesson={lastCompletedLesson} onStartLesson={handleStartLesson} currentWird={wirdState.currentWird} todayLessonCount={wirdState.todayLessonCount} dailyGoal={getDailyGoal(onboardingData.onboardingDailyGoal)} onboardingData={onboardingData} />}
      {screen === "lesson" && currentLessonId === "review" && (() => {
        const reviewPayload = buildReviewLessonPayload(mastery, completedLessonIds, getTodayDateString());
        if (!reviewPayload) {
          return (
            <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center" }}>
              <span style={{ fontSize: 40 }}>{"\u2615"}</span>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text)" }}>Nothing to review right now</p>
              <p style={{ fontSize: 14, color: "var(--c-text-soft)", lineHeight: 1.5 }}>Complete more lessons and your review items will appear here.</p>
              <button className="btn btn-primary" onClick={handleGoHome} style={{ marginTop: 8 }}>Back to Home</button>
            </div>
          );
        }
        return (
          <LessonErrorBoundary onBack={handleGoHome}>
            <LessonScreen
              lessonId="review"
              lessonOverride={reviewPayload}
              progress={progress} completedLessonIds={completedLessonIds} lessonsCompleted={lessonsCompleted} onComplete={handleLessonComplete} onBack={handleGoHome}
            />
          </LessonErrorBoundary>
        );
      })()}
      {screen === "lesson" && currentLessonId !== "review" && (
        <LessonErrorBoundary onBack={handleGoHome}>
          <LessonScreen lessonId={currentLessonId} progress={progress} completedLessonIds={completedLessonIds} lessonsCompleted={lessonsCompleted} onComplete={handleLessonComplete} onBack={handleGoHome} />
        </LessonErrorBoundary>
      )}
      {screen === "progress" && <ProgressScreen progress={progress} completedLessonIds={completedLessonIds} onStartLesson={handleStartLesson} />}
      {!["lesson", "returnHadith", "phaseComplete", "postLessonOnboarding"].includes(screen) && <div className="nav-bar">
        <button className={`nav-item ${activeTab === "home" ? "active" : ""}`} onClick={() => setScreen("home")}><Icons.Home size={22} color={activeTab === "home" ? "var(--c-primary)" : "var(--c-text-muted)"} /><span>Home</span></button>
        <button className={`nav-item ${activeTab === "progress" ? "active" : ""}`} onClick={() => setScreen("progress")}><Icons.Chart size={22} color={activeTab === "progress" ? "var(--c-primary)" : "var(--c-text-muted)"} /><span>Progress</span></button>
      </div>}
    </div>
  );
}
