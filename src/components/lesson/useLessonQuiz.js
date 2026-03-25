import { useState, useEffect, useRef, useCallback } from "react";
import { sfxCorrect, sfxWrong, sfxComplete, sfxCompletePerfect, playLetterAudio, sfxStreakTier1, sfxStreakTier2, sfxStreakTier3 } from "../../lib/audio.js";
import { playGeneratedArabicAudio } from "../../lib/tts.js";
import { generateLessonQuestions, getWrongExplanation, getContrastExplanation, getHarakatWrongExplanation, pickRandom, shuffle } from "../../lib/questions/index.js";
import { normalizeEntityKey, deriveSkillKeysFromQuestion } from "../../lib/mastery.js";

const CORRECT_MESSAGES = ["That's right.", "You got it.", "Correct.", "Well spotted.", "Exactly right.", "You see the difference.", "Good eye.", "Clear and correct."];
const SOUND_CORRECT = ["You matched it.", "Good ear.", "That's the sound.", "You recognized it.", "Right match.", "Your ear is learning."];
const HARAKAT_CORRECT = ["You read that.", "You heard the vowel.", "That's the right sound.", "You're reading Arabic sounds.", "You matched the mark to the sound.", "You can hear the difference."];

/** Honest quiz progress: uses the live queue length. Progress may dip when missed questions are recycled — this is intentional. */
export function computeQuizProgress(qIndex, totalQuestions, originalQCount) {
  const effectiveTotal = Math.max(totalQuestions, originalQCount, 1);
  return Math.min(100, Math.max(0, (qIndex / effectiveTotal) * 100));
}

export default function useLessonQuiz({ lesson, progress, lessonsCompleted, isContrast, audioType, phase, setPhase }) {
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [quizResults, setQuizResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [wrongExplanation, setWrongExplanation] = useState(null);
  const [originalQCount, setOriginalQCount] = useState(0);
  const [midPoint, setMidPoint] = useState(-1);
  const [midShown, setMidShown] = useState(false);
  const [bannerStreak, setBannerStreak] = useState(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const bannerTimeoutRef = useRef(null);

  useEffect(() => {
    return () => { if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current); };
  }, []);

  // Generate questions when entering quiz phase
  useEffect(() => {
    if (phase === "quiz" && questions.length === 0) {
      const qs = generateLessonQuestions(lesson, progress);
      if (!qs || qs.length === 0) {
        setPhase("summary");
        return;
      }
      setQuestions(qs);
      setOriginalQCount(qs.length);
      if (qs.length >= 8) setMidPoint(Math.floor(qs.length * 0.45));
    }
  }, [phase, questions.length, lesson, progress, setPhase]);

  const currentQ = questions[qIndex];
  const answered = selected !== null;
  const isCorrect = answered && currentQ?.options.find(o => o.id === selected)?.isCorrect;
  const isFirstCorrect = lessonsCompleted === 0 && lesson.id === 1 && isCorrect && quizResults.filter(r => r.correct).length === 1;

  const playQuestionAudio = useCallback((q) => {
    if (q?.ttsText) playGeneratedArabicAudio(q.ttsText);
    else if (q?.targetId) playLetterAudio(q.targetId, audioType);
  }, [audioType]);

  const handleSelect = (optionId) => {
    if (answered || isAdvancing) return; setSelected(optionId);
    const correct = currentQ.options.find(o => o.id === optionId)?.isCorrect;

    // Build rich quiz result for mastery tracking
    const targetKey = normalizeEntityKey(currentQ.targetId, currentQ);
    const selectedKey = correct ? targetKey : normalizeEntityKey(optionId, currentQ);
    const skillKeys = deriveSkillKeysFromQuestion(currentQ);
    setQuizResults(prev => [...prev, {
      targetId: currentQ.targetId,
      correct,
      targetKey,
      selectedId: optionId,
      selectedKey,
      skillKeys,
      isHarakat: !!currentQ.isHarakat,
      hasAudio: !!currentQ.hasAudio,
      questionType: currentQ.type || null,
      latencyMs: null,
    }]);
    if (correct) {
      sfxCorrect(); setWrongExplanation(null); setIsAdvancing(true);
      const ns = streak + 1; setStreak(ns);
      if ([3, 5, 7].includes(ns)) {
        if (ns === 3) sfxStreakTier1();
        else if (ns === 5) sfxStreakTier2();
        else sfxStreakTier3();
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        setBannerStreak(ns);
        bannerTimeoutRef.current = setTimeout(() => setBannerStreak(null), 2000);
      }
    } else {
      sfxWrong(); setStreak(0);
      const isSoundQ = currentQ.hasAudio || currentQ.optionMode === "sound";
      if (currentQ.isHarakat) {
        setWrongExplanation(getHarakatWrongExplanation(currentQ, optionId));
      } else {
        setWrongExplanation(isContrast ? getContrastExplanation(optionId, currentQ.targetId) : getWrongExplanation(optionId, currentQ.targetId, isSoundQ ? "sound" : "recognition"));
      }
      if (isSoundQ || currentQ.ttsText) {
        setTimeout(() => playQuestionAudio(currentQ), 600);
      }
      const recycleCount = currentQ._recycleCount || 0;
      if (recycleCount < 1) {
        setQuestions(prev => [...prev, {
          ...currentQ,
          options: shuffle([...currentQ.options]),
          _recycled: true,
          _recycleCount: recycleCount + 1,
        }]);
      }
    }
  };

  const handleQuizNext = useCallback(() => {
    setIsAdvancing(false);
    const nextIdx = qIndex + 1;
    if (nextIdx < questions.length) {
      if (midPoint > 0 && nextIdx === midPoint && !midShown) {
        setPhase("midCelebrate");
        return;
      }
      setQIndex(nextIdx); setSelected(null); setWrongExplanation(null);
    } else {
      const qC = quizResults.filter(r => r.correct).length;
      const qT = quizResults.length;
      const qPct = qT > 0 ? Math.round((qC / qT) * 100) : 0;
      if (qPct === 100) sfxCompletePerfect();
      else if (qPct >= 60) sfxComplete();
      setPhase("summary");
    }
  }, [qIndex, questions.length, midPoint, midShown, quizResults, setPhase]);

  const handleMidContinue = useCallback(() => {
    setIsAdvancing(false);
    setMidShown(true);
    setQIndex(midPoint); setSelected(null); setWrongExplanation(null);
    setPhase("quiz");
  }, [midPoint, setPhase]);

  // Auto-play audio when a new sound question appears
  useEffect(() => {
    if (phase === "quiz" && currentQ && currentQ.hasAudio && !answered) {
      const t = setTimeout(() => playQuestionAudio(currentQ), 300);
      return () => clearTimeout(t);
    }
  }, [qIndex, phase, currentQ, answered, playQuestionAudio]);

  // Auto-advance on correct answer
  useEffect(() => { if (answered && isCorrect) { const t = setTimeout(handleQuizNext, 850); return () => clearTimeout(t); } }, [answered, isCorrect, handleQuizNext]);

  // Auto-continue mid celebration
  useEffect(() => { if (phase === "midCelebrate") { const t = setTimeout(handleMidContinue, 1400); return () => clearTimeout(t); } }, [phase, handleMidContinue]);

  const isSoundQ = currentQ?.hasAudio || currentQ?.optionMode === "sound";
  const feedbackMsg = answered ? (isCorrect ? (isFirstCorrect ? "You're already learning this" : currentQ.isHarakat ? pickRandom(HARAKAT_CORRECT) : isSoundQ ? pickRandom(SOUND_CORRECT) : pickRandom(CORRECT_MESSAGES)) : wrongExplanation) : null;
  const progressPct = phase === "quiz" ? computeQuizProgress(qIndex, questions.length, originalQCount) : phase === "midCelebrate" ? 50 : phase === "summary" ? 100 : 0;

  return {
    currentQ, qIndex, originalQCount, selected, answered, isCorrect,
    quizResults, streak, bannerStreak, wrongExplanation, feedbackMsg,
    progressPct, isSoundQ, isAdvancing,
    handleSelect,
    handleNext: handleQuizNext,
    resumeAfterMid: handleMidContinue,
    playQuestionAudio,
  };
}
