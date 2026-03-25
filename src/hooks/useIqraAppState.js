import { useState, useCallback, useEffect, useMemo } from "react";
import { loadProgress, saveProgress, recalculateWirdOnAppOpen, recordPractice, getTodayDateString, getDayDifference, getCompletedPhaseIntercept, buildLegacyProgressView } from "../lib/progress.js";
import { mergeQuizResultsIntoMastery } from "../lib/mastery.js";
import { getLessonsCompletedCount, getLastCompletedLesson } from "../lib/selectors.js";
import { sfxWirdMilestone } from "../lib/audio.js";

export default function useIqraAppState() {
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
      completedLessonIds,
      mastery,
      habit,
    });
    if (!ok && !saveFailed) setSaveFailed(true);
  }, [onboardingData, mastery, completedLessonIds, habit]);

  const handleLessonComplete = useCallback((lessonId, quizResults, speakResults) => {
    let hasPhaseIntercept = false;

    // Only track numeric lesson IDs in completedLessonIds (skip "review" etc.)
    if (typeof lessonId === "number") {
      setCompletedLessonIds(prev => {
        const newIds = prev.includes(lessonId) ? prev : [...prev, lessonId];

        if (!prev.includes(lessonId)) {
          const intercept = getCompletedPhaseIntercept(prev, newIds);
          if (intercept) {
            hasPhaseIntercept = true;
            setPhaseCompleteData(intercept);
          }
        }

        return newIds;
      });
    }

    // Merge quiz results into mastery (entities, skills, confusions + SRS)
    const today = getTodayDateString();
    setMastery(prev => mergeQuizResultsIntoMastery(prev, quizResults, today));

    setHabit(prev => {
      const next = recordPractice(prev);
      if (next.currentWird > prev.currentWird) {
        sfxWirdMilestone();
      }
      return next;
    });

    return hasPhaseIntercept;
  }, []);

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
    handlePostLessonOnboardingComplete,
  };
}
