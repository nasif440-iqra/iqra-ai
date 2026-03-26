import { useState, useCallback, useEffect, useMemo } from "react";
import { LESSONS } from "../data/lessons.js";
import { loadProgress, saveProgress, recalculateWirdOnAppOpen, recordPractice, getTodayDateString, getDayDifference, getCompletedPhaseIntercept, buildLegacyProgressView } from "../lib/progress.js";
import { mergeQuizResultsIntoMastery } from "../lib/mastery.js";
import { getLessonsCompletedCount, getLastCompletedLesson } from "../lib/selectors.js";
import { evaluateLessonOutcome } from "../lib/outcome.js";
import { sfxWirdMilestone } from "../lib/audio.js";

export default function useTilaAppState() {
  // Load and normalize progress on mount (lazy initializer — safe in StrictMode)
  const [saved] = useState(() => {
    const raw = loadProgress();
    const { result: updatedHabit, changed } = recalculateWirdOnAppOpen(raw.habit);
    const loaded = changed ? { ...raw, habit: updatedHabit } : raw;
    if (changed) {
      saveProgress({
        onboarded: loaded.onboarded,
        onboardingIntention: loaded.onboardingIntention,
        onboardingDailyGoal: loaded.onboardingDailyGoal,
        onboardingStartingPoint: loaded.onboardingStartingPoint,
        onboardingMotivation: loaded.onboardingMotivation,
        onboardingCommitmentComplete: loaded.onboardingCommitmentComplete,
        onboardingVersion: loaded.onboardingVersion,
        completedLessonIds: loaded.completedLessonIds,
        mastery: loaded.mastery,
        habit: loaded.habit,
      });
    }
    return loaded;
  });

  // Determine if we should show the return-user hadith interstitial
  const shouldShowHadith = () => {
    if (!saved.habit.lastPracticeDate) return false;
    const today = getTodayDateString();
    const gap = getDayDifference(today, saved.habit.lastPracticeDate);
    if (gap < 1) return false;
    const lastShown = localStorage.getItem("lastHadithInterstitialDate");
    if (lastShown === today) return false;
    return true;
  };

  const initialScreen = shouldShowHadith() ? "returnHadith" : "home";

  const [mastery, setMastery] = useState(saved.mastery);
  const [completedLessonIds, setCompletedLessonIds] = useState(saved.completedLessonIds);

  // Derived values — no independent state needed
  const lessonsCompleted = useMemo(() => getLessonsCompletedCount(completedLessonIds), [completedLessonIds]);
  const lastCompletedLesson = useMemo(() => getLastCompletedLesson(completedLessonIds), [completedLessonIds]);

  // Legacy flat progress view for backward-compat consumers (LessonScreen, questions, etc.)
  const progress = useMemo(() => buildLegacyProgressView(mastery.entities), [mastery]);

  const [habit, setHabit] = useState(saved.habit);
  const [phaseCompleteData, setPhaseCompleteData] = useState(null);
  const [onboardingData, setOnboardingData] = useState({
    onboarded: saved.onboarded,
    onboardingIntention: saved.onboardingIntention,
    onboardingDailyGoal: saved.onboardingDailyGoal,
    onboardingStartingPoint: saved.onboardingStartingPoint,
    onboardingMotivation: saved.onboardingMotivation,
    onboardingCommitmentComplete: saved.onboardingCommitmentComplete,
    onboardingVersion: saved.onboardingVersion,
    wirdIntroSeen: saved.wirdIntroSeen,
  });

  const hasCompletedOnboarding = onboardingData.onboarded;

  // Backward-compat alias so App.jsx can keep using wirdState.currentWird etc.
  const wirdState = habit;

  const [saveFailed, setSaveFailed] = useState(false);

  // Persist state changes
  useEffect(() => {
    const ok = saveProgress({
      onboarded: onboardingData.onboarded,
      onboardingIntention: onboardingData.onboardingIntention,
      onboardingDailyGoal: onboardingData.onboardingDailyGoal,
      onboardingStartingPoint: onboardingData.onboardingStartingPoint,
      onboardingMotivation: onboardingData.onboardingMotivation,
      onboardingCommitmentComplete: onboardingData.onboardingCommitmentComplete,
      onboardingVersion: onboardingData.onboardingVersion,
      wirdIntroSeen: onboardingData.wirdIntroSeen,
      completedLessonIds,
      mastery,
      habit,
    });
    if (!ok && !saveFailed) setSaveFailed(true);
  }, [onboardingData, mastery, completedLessonIds, habit]);

  /**
   * Handle lesson completion — FIX 1 + FIX 2.
   *
   * 1. Evaluate outcome (pass/fail) from quiz results.
   * 2. Compute next completedLessonIds BEFORE committing state (React-safe).
   * 3. Compute phase intercept deterministically from prev → next IDs.
   * 4. Commit all state.
   * 5. Return structured result — no closure mutation hacks.
   */
  const handleLessonComplete = useCallback((lessonId, quizResults, speakResults) => {
    // Derive lesson mode from the actual lesson definition — not from quiz result heuristics
    const lesson = typeof lessonId === "number"
      ? LESSONS.find(l => l.id === lessonId)
      : null;
    const lessonMode = lesson?.lessonMode
      || (typeof lessonId === "string" ? lessonId : "recognition");

    const outcome = evaluateLessonOutcome(quizResults, lessonMode);
    let phaseIntercept = null;

    // Only mark as completed if passed AND is a progression lesson (numeric ID)
    if (outcome.passed && typeof lessonId === "number") {
      // Read current IDs synchronously from state (this runs inside an event handler,
      // so the closure value is the latest committed state).
      setCompletedLessonIds(prev => {
        if (prev.includes(lessonId)) return prev;
        return [...prev, lessonId];
      });

      // Compute phase intercept deterministically from prev → next
      // (reads completedLessonIds from the closure — guaranteed current in event handler)
      const prevIds = completedLessonIds;
      if (!prevIds.includes(lessonId)) {
        const nextIds = [...prevIds, lessonId];
        phaseIntercept = getCompletedPhaseIntercept(prevIds, nextIds);
        if (phaseIntercept) {
          setPhaseCompleteData(phaseIntercept);
        }
      }
    }

    // Always merge quiz results into mastery (even on fail — SRS needs this)
    const today = getTodayDateString();
    setMastery(prev => mergeQuizResultsIntoMastery(prev, quizResults, today));

    // Always record practice (even on fail — habit tracking)
    setHabit(prev => {
      const next = recordPractice(prev);
      if (next.currentWird > prev.currentWird) {
        sfxWirdMilestone();
      }
      return next;
    });

    return { passed: outcome.passed, phaseIntercept, outcome };
  }, [completedLessonIds]);

  const handlePhaseCompleteContinue = useCallback(() => {
    setPhaseCompleteData(null);
  }, []);

  const handleDismissHadith = useCallback(() => {
    localStorage.setItem("lastHadithInterstitialDate", getTodayDateString());
  }, []);

  // Pre-lesson onboarding complete: sets onboarded=true with startingPoint
  const handleOnboardingComplete = useCallback(({ startingPoint }) => {
    setOnboardingData(prev => ({
      ...prev,
      onboarded: true,
      onboardingStartingPoint: startingPoint,
      onboardingVersion: 2,
    }));
  }, []);

  // Wird introduction complete: mark as seen
  const handleWirdIntroComplete = useCallback(() => {
    setOnboardingData(prev => ({
      ...prev,
      wirdIntroSeen: true,
    }));
  }, []);

  // Post-lesson onboarding complete: sets motivation, dailyGoal, commitment
  const handlePostLessonOnboardingComplete = useCallback(({ motivation, dailyGoal }) => {
    setOnboardingData(prev => ({
      ...prev,
      onboardingMotivation: motivation,
      onboardingIntention: motivation,
      onboardingDailyGoal: dailyGoal,
      onboardingCommitmentComplete: true,
    }));
  }, []);

  return {
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
    handleLessonComplete,
    handlePhaseCompleteContinue,
    handleDismissHadith,
    handleOnboardingComplete,
    handleWirdIntroComplete,
    handlePostLessonOnboardingComplete,
  };
}
