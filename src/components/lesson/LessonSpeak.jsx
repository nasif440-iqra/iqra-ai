import { Icons } from "../Icons.jsx";
import { sfxTap } from "../../lib/audio.js";
import { playLetterAudio } from "../../lib/audio.js";

export default function LessonSpeak({ currentLetter, speakIndex, totalLetters, speakPhase, audioType, onRecord, onNext, onSkipToSummary }) {
  return (
    <div className="screen" style={{ background: "var(--c-bg)", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => { sfxTap(); onSkipToSummary(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icons.X size={22} color="var(--c-text-soft)" /></button>
          <div className="progress-track" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${90 + ((speakIndex / Math.max(totalLetters, 1)) * 8)}%` }} /></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)" }}>{"\uD83C\uDFA4"} {speakIndex + 1}/{totalLetters}</span>
        </div>
        <div style={{ textAlign: "center" }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-accent)", background: "var(--c-accent-light)", padding: "4px 14px", borderRadius: 20 }}>{"Practice only \u2014 just try your best"}</span></div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        {speakPhase === "ready" && <>
          <div className="scale-in" key={speakIndex}><div className="arabic-letter" style={{ fontSize: 110, marginBottom: 4 }}>{currentLetter.letter}</div></div>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Try saying: <span style={{ color: "var(--c-primary)" }}>{currentLetter.name}</span></h3>
          <p style={{ fontSize: 14, color: "var(--c-text-soft)", marginBottom: 20 }}>{`"${currentLetter.transliteration}" \u2014 ${currentLetter.soundHint}`}</p>
          <button className="btn btn-outline" onClick={() => playLetterAudio(currentLetter.id, audioType)} style={{ width: "auto", padding: "8px 20px", fontSize: 14, marginBottom: 24 }}><Icons.Volume size={18} color="var(--c-primary)" /> Hear it first</button>
          <button className="mic-btn" onClick={onRecord}><Icons.Mic size={36} color="white" /></button>
          <p style={{ fontSize: 13, color: "var(--c-text-muted)", marginTop: 12 }}>{"Tap when ready \u2014 no rush"}</p>
          <button className="btn btn-ghost" onClick={onNext} style={{ marginTop: 16, fontSize: 13, color: "var(--c-text-muted)" }}>{"Skip"}</button>
        </>}
        {speakPhase === "recording" && <div className="scale-in" style={{ textAlign: "center" }}><div className="arabic-letter" style={{ fontSize: 90, marginBottom: 16, opacity: 0.6 }}>{currentLetter.letter}</div><div className="mic-btn recording" style={{ margin: "0 auto 16px" }}><Icons.Mic size={36} color="white" /></div><p style={{ fontSize: 16, fontWeight: 700, color: "var(--c-primary)" }}>Go ahead...</p></div>}
        {speakPhase === "done" && <div className="fade-up" style={{ width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2705"}</div>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--c-primary-dark)", marginBottom: 8 }}>Nice try!</p>
          <p style={{ fontSize: 14, color: "var(--c-text-soft)", marginBottom: 16 }}>{"Keep practicing \u2014 real feedback coming soon."}</p>
          <button className="btn btn-secondary" onClick={() => playLetterAudio(currentLetter.id, audioType)} style={{ marginBottom: 10 }}><Icons.Volume size={20} color="white" /> Hear It Again</button>
        </div>}
      </div>
      <div style={{ paddingBottom: 24, minHeight: 70 }}>{speakPhase === "done" && <button className="btn btn-primary" onClick={() => { sfxTap(); onNext(); }}>{speakIndex < totalLetters - 1 ? `Next: ${/* next letter name placeholder */ "next"}` : "Back to Results"}</button>}</div>
    </div>
  );
}
