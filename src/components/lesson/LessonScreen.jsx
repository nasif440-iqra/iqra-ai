import { useState } from "react";
import { LESSONS } from "../../data/lessons.js";
import { getLetter } from "../../data/letters.js";
import { sfxTap, sfxCorrect, sfxComplete } from "../../lib/audio.js";
import { getCombo, generateHarakatCombos } from "../../data/harakat.js";
import { FEATURES } from "../../lib/features.js";
import useLessonQuiz from "./useLessonQuiz.js";

import LessonIntro from "./LessonIntro.jsx";
import LessonQuiz from "./LessonQuiz.jsx";
import LessonMidCelebrate from "./LessonMidCelebrate.jsx";
import LessonSummary from "./LessonSummary.jsx";
import LessonSpeak from "./LessonSpeak.jsx";
import LessonErrorBoundary from "./LessonErrorBoundary.jsx";
import LessonHybrid from "./LessonHybrid.jsx";
import { generateHybridExercises } from "../../lib/questions/index.js";

export default function LessonScreen({ lessonId, lessonOverride, progress, completedLessonIds, lessonsCompleted, onComplete, onRetry, onBack, skipIntro }) {
  const lesson = lessonOverride || LESSONS.find(l => l.id === lessonId);
  if (!lesson) {
    return <div style={{ padding: 40, textAlign: "center" }}><p>Lesson not found.</p><button className="btn btn-primary" onClick={onBack}>Go Back</button></div>;
  }
  const teachLetters = (lesson.teachIds || []).map(id => getLetter(id)).filter(Boolean);

  // Phase 4+ hybrid lessons use the new three-stage framework
  if (lesson.lessonType === "hybrid") {
    const exercises = generateHybridExercises(lesson, progress);
    return (
      <LessonErrorBoundary onBack={onBack}>
        <LessonHybrid
          lesson={lesson}
          exercises={exercises}
          progress={progress}
          completedLessonIds={completedLessonIds}
          lessonsCompleted={lessonsCompleted}
          onComplete={onComplete}
          onRetry={onRetry}
          onBack={onBack}
        />
      </LessonErrorBoundary>
    );
  }

  const isSound = lesson.lessonMode === "sound";
  const isContrast = lesson.lessonMode === "contrast";
  const isHarakatIntro = lesson.lessonMode === "harakat-intro";
  const isHarakatApplied = lesson.lessonMode === "harakat" || lesson.lessonMode === "harakat-mixed";
  const isHarakatLesson = isHarakatIntro || isHarakatApplied;
  const lessonCombos = isHarakatApplied
    ? (lesson.teachCombos?.length > 0
      ? lesson.teachCombos.map(id => getCombo(id)).filter(Boolean)
      : generateHarakatCombos(lesson.teachIds || [], lesson.teachHarakat))
    : [];
  const isPhase2Checkpoint = lesson.lessonMode === "checkpoint" && lesson.phase === 2;
  const audioType = (isSound || isContrast || isPhase2Checkpoint) ? "sound" : "name";

  const [phase, setPhase] = useState(skipIntro ? "quiz" : "intro");
  const [speakIndex, setSpeakIndex] = useState(0);
  const [speakPhase, setSpeakPhase] = useState("ready");
  const [speakResults, setSpeakResults] = useState([]);

  const quiz = useLessonQuiz({ lesson, progress, lessonsCompleted, isContrast, audioType, phase, setPhase });

  const currentSpeakLetter = teachLetters[speakIndex];
  const handleRecord = () => {
    sfxTap(); setSpeakPhase("recording");
    setTimeout(() => {
      setSpeakPhase("done");
      setSpeakResults(prev => [...prev, { letterId: currentSpeakLetter.id }]);
      sfxCorrect();
    }, 2000);
  };
  const handleSpeakNext = () => { if (speakIndex < teachLetters.length - 1) { setSpeakIndex(speakIndex + 1); setSpeakPhase("ready"); } else { sfxComplete(); setPhase("summary"); } };

  if (phase === "intro") {
    return <LessonIntro lesson={lesson} teachLetters={teachLetters} lessonCombos={lessonCombos} isSound={isSound} isContrast={isContrast} isHarakatIntro={isHarakatIntro} isHarakatApplied={isHarakatApplied} audioType={audioType} onBack={onBack} onStartQuiz={() => setPhase("quiz")} />;
  }

  if (phase === "midCelebrate") {
    return <LessonMidCelebrate isHarakatLesson={isHarakatLesson} correctCount={quiz.quizResults.filter(r => r.correct).length} onContinue={quiz.resumeAfterMid} />;
  }

  if (phase === "summary") {
    return <LessonSummary lesson={lesson} lessonId={lessonId} teachLetters={teachLetters} lessonCombos={lessonCombos} quizResults={quiz.quizResults} speakResults={speakResults} lessonsCompleted={lessonsCompleted} isHarakatIntro={isHarakatIntro} isHarakatApplied={isHarakatApplied} onComplete={onComplete} onRetry={onRetry} onBack={onBack} onStartSpeak={FEATURES.speakingPractice ? () => setPhase("speak") : null} speakingEnabled={FEATURES.speakingPractice} />;
  }

  if (FEATURES.speakingPractice && phase === "speak" && currentSpeakLetter) {
    return <LessonSpeak currentLetter={currentSpeakLetter} speakIndex={speakIndex} totalLetters={teachLetters.length} speakPhase={speakPhase} audioType={audioType} onRecord={handleRecord} onNext={handleSpeakNext} onSkipToSummary={() => setPhase("summary")} />;
  }

  // phase === "quiz"
  return (
    <LessonQuiz currentQ={quiz.currentQ} qIndex={quiz.qIndex} originalQCount={quiz.originalQCount} progressPct={quiz.progressPct} selected={quiz.selected} isCorrect={quiz.isCorrect} answered={quiz.answered} feedbackMsg={quiz.feedbackMsg} wrongExplanation={quiz.wrongExplanation} streak={quiz.streak} bannerStreak={quiz.bannerStreak} isHarakatLesson={isHarakatLesson} isContrast={isContrast} isSoundQ={quiz.isSoundQ} audioType={audioType} onSelect={quiz.handleSelect} onNext={quiz.handleNext} onBack={onBack} playQuestionAudio={quiz.playQuestionAudio} />
  );
}
