import { motion } from "framer-motion";
import { Icons } from "../Icons.jsx";
import { sfxTap, sfxLessonStart, playLetterAudio } from "../../lib/audio.js";
import { playGeneratedArabicAudio } from "../../lib/tts.js";
import { getHarakah } from "../../data/harakat.js";
import { PronunciationCard } from "../PronunciationGuide.jsx";

export default function LessonIntro({ lesson, teachLetters, lessonCombos, isSound, isContrast, isHarakatIntro, isHarakatApplied, audioType, onBack, onStartQuiz }) {
  if (isHarakatIntro) {
    const harakatItems = (lesson.teachHarakat || []).map(id => getHarakah(id)).filter(Boolean);
    return (
      <div className="screen" style={{ background: "var(--c-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icons.ArrowLeft size={22} color="var(--c-text-soft)" /></button>
          <div style={{ flex: 1, textAlign: "center" }}><span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 500, color: "var(--c-text-muted)" }}>{lesson.title}</span></div>
          <div style={{ width: 30 }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--c-accent-light)", padding: "5px 14px", borderRadius: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-accent)" }}>{"\u2728"} Concept Lesson {"\u2014"} learn something new</span>
          </div>
          <h2 className="scale-in" style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 600, color: "var(--c-primary-dark)", marginBottom: 8, textAlign: "center" }}>Harakat are small marks</h2>
          <p style={{ fontSize: 14, color: "var(--c-text-soft)", textAlign: "center", maxWidth: 300, marginBottom: 20, lineHeight: 1.6 }}>
            They sit on top of or below letters. They are not new letters {"\u2014"} they change how a letter sounds by adding a short vowel.
          </p>
          <div className="scale-in" style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
            {harakatItems.map(h => (
              <div key={h.id} style={{ textAlign: "center", background: "var(--c-bg-card)", borderRadius: 20, padding: "16px 18px", boxShadow: "var(--shadow-soft)", border: "1px solid var(--c-border)", minWidth: 88 }}>
                <span style={{ fontFamily: "var(--font-arabic)", fontSize: 48, lineHeight: 1.6, color: "var(--c-primary-dark)", display: "block" }}>{"\u25CC"}{h.mark}</span>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{h.name}</div>
                <div style={{ fontSize: 13, color: "var(--c-accent)", fontWeight: 600, marginTop: 2 }}>short {"\u201C"}{h.sound}{"\u201D"}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 4, marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Example</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-text-soft)" }}>{"\u0628"}</span>
              <span style={{ fontSize: 18, color: "var(--c-text-muted)" }}>+</span>
              <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-accent)" }}>{"\u25CC\u064E"}</span>
              <span style={{ fontSize: 18, color: "var(--c-text-muted)" }}>=</span>
              <span style={{ fontFamily: "var(--font-arabic)", fontSize: 32, color: "var(--c-primary-dark)" }}>{"\u0628\u064E"}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-primary)" }}>{"\u201C"}ba{"\u201D"}</span>
            </div>
            <button className="hear-btn hear-btn--sm" onClick={() => playGeneratedArabicAudio("\u0628\u064E")} style={{ marginTop: 8 }}><span className="hear-icon" /><span>Hear {"\u201C"}ba{"\u201D"}</span></button>
          </div>
          {lesson.familyRule && <p style={{ fontSize: 13, color: "var(--c-text-soft)", lineHeight: 1.5, maxWidth: 300, textAlign: "center", marginTop: 8 }}>{lesson.familyRule}</p>}
        </div>
        <div style={{ paddingBottom: 24 }}>
          <button className="btn btn-primary" onClick={() => { sfxLessonStart(); onStartQuiz(); }}>{"Let\u2019s practice"}</button>
        </div>
      </div>
    );
  }

  if (isHarakatApplied) {
    const displayCombos = lessonCombos.slice(0, 6);
    return (
      <div className="screen" style={{ background: "var(--c-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icons.ArrowLeft size={22} color="var(--c-text-soft)" /></button>
          <div style={{ flex: 1, textAlign: "center" }}><span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 500, color: "var(--c-text-muted)" }}>{lesson.title}</span></div>
          <div style={{ width: 30 }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--c-accent-light)", padding: "5px 14px", borderRadius: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-accent)" }}>{"\u25CC\u064E"} Harakat Lesson</span>
          </div>
          {(() => {
            // Group combos by base letter for organized rows
            const grouped = [];
            const seen = new Map();
            for (const c of displayCombos) {
              if (!seen.has(c.letterId)) { seen.set(c.letterId, grouped.length); grouped.push([]); }
              grouped[seen.get(c.letterId)].push(c);
            }
            const comboCount = displayCombos.length;
            const circleSize = comboCount > 6 ? 56 : comboCount > 3 ? 68 : 80;
            const arabicSize = comboCount > 6 ? 28 : comboCount > 3 ? 34 : 40;

            return (
              <div className="scale-in" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", marginBottom: 20 }}>
                {grouped.map((row, ri) => (
                  <div key={ri} style={{ display: "flex", gap: comboCount > 6 ? 10 : 16, justifyContent: "center" }}>
                    {row.map(c => (
                      <div key={c.id} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{
                          width: circleSize, height: circleSize, borderRadius: "50%",
                          background: "#F2F5F3", border: "2px solid white",
                          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          marginBottom: 6,
                        }}>
                          <span style={{ fontFamily: "var(--font-arabic)", fontSize: arabicSize, lineHeight: 1, color: "var(--c-primary-dark)", marginTop: 4 }} dir="rtl">{c.display}</span>
                        </div>
                        <button
                          className="hear-btn hear-btn--sm"
                          onClick={() => playGeneratedArabicAudio(c.audioText)}
                        >
                          <span className="hear-icon" />
                          <span>{"\u201C"}{c.sound}{"\u201D"}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
          {lesson.familyRule && <p style={{ fontSize: 13, color: "var(--c-text-soft)", lineHeight: 1.5, maxWidth: 300, textAlign: "center", marginTop: 4 }}>{lesson.familyRule}</p>}
        </div>
        <div style={{ paddingBottom: 24 }}>
          <button className="btn btn-primary" onClick={() => { sfxLessonStart(); onStartQuiz(); }}>{"Let\u2019s practice"}</button>
        </div>
      </div>
    );
  }

  // Default: recognition / sound / contrast / checkpoint intro
  const isCheckpoint = lesson.lessonMode === "checkpoint";
  // All lesson intros support tapping letters to hear them
  const hasAudio = true;
  const isLargeGrid = teachLetters.length > 6;
  const circleSize = isLargeGrid ? 52 : teachLetters.length > 2 ? 80 : 112;
  const fontSize = isLargeGrid ? 28 : teachLetters.length > 2 ? 40 : 56;

  return (
    <div className="screen" style={{ background: "var(--c-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icons.ArrowLeft size={22} color="var(--c-text-soft)" /></button>
        <div style={{ flex: 1, textAlign: "center" }}><span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 500, color: "var(--c-text-muted)" }}>{lesson.title}</span></div>
        <div style={{ width: 30 }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: isLargeGrid ? "flex-start" : "center", alignItems: "center", overflowY: isLargeGrid ? "auto" : "visible", paddingTop: isLargeGrid ? 8 : 0 }}>
        {(isSound || isContrast || isCheckpoint) && <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--c-accent-light)", padding: "5px 14px", borderRadius: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-accent)" }}>{isContrast ? "\uD83D\uDD0A Sound Contrast \u2014 hear the difference" : isCheckpoint ? "\uD83D\uDD0A Sound Review \u2014 tap each letter to hear it" : "\uD83D\uDD0A Listening Lesson \u2014 learn how these sound"}</span>
        </div>}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          style={{
            display: "flex",
            gap: isLargeGrid ? 10 : teachLetters.length > 2 ? 16 : 24,
            justifyContent: "center",
            marginBottom: 20,
            flexWrap: "wrap",
            maxWidth: isLargeGrid ? 360 : undefined,
          }}
        >
          {teachLetters.map(l => (
            <div
              key={l.id}
              style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <div style={{
                width: circleSize, height: circleSize, borderRadius: "50%",
                background: "#F2F5F3", border: "2px solid white",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: isLargeGrid ? 4 : 10,
              }}>
                <span style={{ fontFamily: "var(--font-arabic)", fontSize, lineHeight: 1, color: "var(--c-text)", marginTop: isLargeGrid ? 2 : 4 }} dir="rtl">{l.letter}</span>
              </div>
              <div style={{ fontSize: isLargeGrid ? 10 : 14, fontWeight: 600, color: "var(--c-text)", marginBottom: isLargeGrid ? 4 : 8 }}>{l.name}</div>
              {isLargeGrid ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                  onClick={() => playLetterAudio(l.id, audioType)}
                >
                  <span style={{ width: 0, height: 0, borderLeft: "5px solid var(--c-accent)", borderTop: "3px solid transparent", borderBottom: "3px solid transparent", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--c-accent)" }}>
                    {(isSound || isContrast || isCheckpoint) ? l.transliteration : "Hear"}
                  </span>
                </div>
              ) : (
                <button
                  className="hear-btn hear-btn--sm"
                  onClick={() => playLetterAudio(l.id, audioType)}
                >
                  <span className="hear-icon" />
                  <span>{(isSound || isContrast || isCheckpoint) ? `"${l.transliteration}"` : "Hear it"}</span>
                </button>
              )}
            </div>
          ))}
        </motion.div>
        {lesson.familyRule && <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} style={{ fontSize: 13, color: "var(--c-text-soft)", lineHeight: 1.5, maxWidth: 300, textAlign: "center", marginTop: 4 }}>{lesson.familyRule}</motion.p>}
        {/* Pronunciation guides for letters that have articulation data */}
        {(isSound || isContrast) && teachLetters.some(l => l.articulation) && (
          <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
            {teachLetters.filter(l => l.articulation).map(l => {
              const contrastWithId = isContrast
                ? (teachLetters.find(o => o.id !== l.id)?.id || null)
                : null;
              return (
                <PronunciationCard key={l.id} letter={l} audioType={audioType} contrastWithId={contrastWithId} />
              );
            })}
          </div>
        )}
      </div>
      <div style={{ paddingBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => { sfxLessonStart(); onStartQuiz(); }}>{isContrast ? "Start comparing" : hasAudio ? "Start listening" : "Let's practice"}</button>
      </div>
    </div>
  );
}
