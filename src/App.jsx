import { useState, useCallback, useRef, useEffect } from "react";
import useTilaAppState from "./hooks/useTilaAppState.js";
import OnboardingScreen from "./components/OnboardingScreen.jsx";
import PostLessonOnboarding from "./components/PostLessonOnboarding.jsx";
import WirdIntroduction from "./components/WirdIntroduction.jsx";
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
import { parseRoute, serializeRoute, isTransientScreen } from "./lib/routing.js";

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
    handleWirdIntroComplete: onWirdIntroComplete,
    handlePostLessonOnboardingComplete: onPostLessonComplete,
  } = useTilaAppState();

  // ── Route state ──
  // Parse initial hash to restore lesson context on refresh
  const [screen, setScreenRaw] = useState(() => {
    if (initialScreen === "returnHadith") return "returnHadith";
    const hashRoute = parseRoute(window.location.hash);
    return hashRoute.screen;
  });
  const [currentLessonId, setCurrentLessonId] = useState(() => {
    const hashRoute = parseRoute(window.location.hash);
    return hashRoute.lessonId || null;
  });
  // Key to force LessonScreen remount on retry
  const [lessonKey, setLessonKey] = useState(0);
  const [isRetry, setIsRetry] = useState(false);

  // Derive activeTab from screen — eliminates desync risk
  const activeTab = screen === "progress" ? "progress" : "home";

  // ── Hash-based routing (Fix 3) ──
  const suppressHashSync = useRef(false);

  // Push hash when screen/lessonId changes — skip for transient screens
  useEffect(() => {
    if (suppressHashSync.current) {
      suppressHashSync.current = false;
      return;
    }
    // Transient screens: replace the current hash with home so browser-back
    // goes to home instead of re-entering a completed lesson.
    if (isTransientScreen(screen)) {
      const current = window.location.hash.replace("#", "");
      if (current) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }

    const route = screen === "lesson" && currentLessonId != null
      ? { screen: "lesson", lessonId: currentLessonId }
      : { screen };
    const hash = serializeRoute(route);
    const current = window.location.hash.replace("#", "");
    if (current !== hash) {
      if (hash) {
        window.history.pushState(null, "", `#${hash}`);
      } else {
        window.history.pushState(null, "", window.location.pathname);
      }
    }
  }, [screen, currentLessonId]);

  // Listen for browser back/forward — restore from hash
  useEffect(() => {
    const onPopState = () => {
      const route = parseRoute(window.location.hash);
      suppressHashSync.current = true;

      if (route.screen === "lesson" && route.lessonId) {
        setCurrentLessonId(route.lessonId);
        setLessonKey(k => k + 1); // fresh lesson state on back-nav
        setScreenRaw("lesson");
      } else if (route.screen === "progress") {
        setScreenRaw("progress");
      } else {
        setScreenRaw("home");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
    setLessonKey(k => k + 1);
    setScreenRaw("lesson");
  }, []);

  // Wird introduction complete: mark seen, then go home
  const handleWirdIntroComplete = useCallback(() => {
    onWirdIntroComplete();
    sfxTransition();
    setScreenRaw("home");
  }, [onWirdIntroComplete]);

  // Post-lesson onboarding complete
  const handlePostLessonComplete = useCallback(({ motivation, dailyGoal }) => {
    onPostLessonComplete({ motivation, dailyGoal });
    sfxTransition();
    setScreenRaw("home");
  }, [onPostLessonComplete]);

  const handleStartLesson = useCallback((id) => {
    sfxTransition();
    setCurrentLessonId(id);
    setIsRetry(false);
    setLessonKey(k => k + 1);
    setScreenRaw("lesson");
  }, []);

  const handleGoHome = useCallback(() => {
    sfxTransition();
    setScreenRaw("home");
  }, []);

  // ── Lesson completion (Fix 1: pass/fail gating) ──
  const handleLessonComplete = useCallback((lessonId, quizResults, speakResults) => {
    const result = onLessonComplete(lessonId, quizResults, speakResults);

    if (!result.passed) {
      // Failed — mastery was recorded but lesson NOT completed.
      // Navigate home; user can retry from there.
      setScreenRaw("home");
      return;
    }

    // Passed — navigate to the appropriate next screen
    if (lessonId === 1 && !onboardingData.onboardingCommitmentComplete) {
      setScreenRaw("postLessonOnboarding");
      return;
    }

    if (onboardingData.onboardingCommitmentComplete && !onboardingData.wirdIntroSeen) {
      setScreenRaw("wirdIntroduction");
      return;
    }

    if (result.phaseIntercept) {
      setScreenRaw("phaseComplete");
    } else {
      setScreenRaw("home");
    }
  }, [onLessonComplete, onboardingData.onboardingCommitmentComplete, onboardingData.wirdIntroSeen]);

  // Retry failed lesson: record mastery from failed attempt, skip intro
  const handleLessonRetry = useCallback((lessonId, quizResults) => {
    // Record mastery from failed attempt (important for SRS)
    onLessonComplete(lessonId, quizResults, []);
    // Remount LessonScreen, skip intro on retry
    setIsRetry(true);
    setLessonKey(k => k + 1);
  }, [onLessonComplete]);

  const handleDismissHadith = useCallback(() => {
    onDismissHadith();
    setScreenRaw("home");
  }, [onDismissHadith]);

  const handlePhaseCompleteContinue = useCallback(() => {
    onPhaseCompleteContinue();
    setScreenRaw("home");
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
      {screen === "wirdIntroduction" && <WirdIntroduction onComplete={handleWirdIntroComplete} />}
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
              key={lessonKey}
              lessonId="review"
              lessonOverride={reviewPayload}
              progress={progress} completedLessonIds={completedLessonIds} lessonsCompleted={lessonsCompleted} onComplete={handleLessonComplete} onRetry={handleLessonRetry} onBack={handleGoHome} skipIntro={isRetry}
            />
          </LessonErrorBoundary>
        );
      })()}
      {screen === "lesson" && currentLessonId !== "review" && (
        <LessonErrorBoundary onBack={handleGoHome}>
          <LessonScreen key={lessonKey} lessonId={currentLessonId} progress={progress} completedLessonIds={completedLessonIds} lessonsCompleted={lessonsCompleted} onComplete={handleLessonComplete} onRetry={handleLessonRetry} onBack={handleGoHome} skipIntro={isRetry} />
        </LessonErrorBoundary>
      )}
      {screen === "progress" && <ProgressScreen progress={progress} completedLessonIds={completedLessonIds} onStartLesson={handleStartLesson} />}
      {!["lesson", "returnHadith", "phaseComplete", "wirdIntroduction", "postLessonOnboarding"].includes(screen) && <div className="nav-bar">
        <button className={`nav-item ${activeTab === "home" ? "active" : ""}`} onClick={() => setScreenRaw("home")}><Icons.Home size={22} color={activeTab === "home" ? "var(--c-primary)" : "var(--c-text-muted)"} /><span>Home</span></button>
        <button className={`nav-item ${activeTab === "progress" ? "active" : ""}`} onClick={() => setScreenRaw("progress")}><Icons.Chart size={22} color={activeTab === "progress" ? "var(--c-primary)" : "var(--c-text-muted)"} /><span>Progress</span></button>
      </div>}
    </div>
  );
}
