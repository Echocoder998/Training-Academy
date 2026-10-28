"use client";
import { useRef, useState, useEffect } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { ChatTurn, Grade } from "@/db/schema";

type Scn = { id: string; num: number; opening: string };

export function RolePlay({ scenario, initialMode }: { scenario: Scn; initialMode: "voice" | "chat" }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className="card stack" style={{ gap: 16 }}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === "voice"} onClick={() => setMode("voice")}>Voice call</button>
        <button role="tab" aria-selected={mode === "chat"} onClick={() => setMode("chat")}>Chat</button>
      </div>
      {mode === "voice"
        ? <ConversationProvider><VoiceCall scenario={scenario} /></ConversationProvider>
        : <ChatCall scenario={scenario} />}
    </div>
  );
}

/* ─── Shared grading ───────────────────────────────────────────── */
function useGrader(scenarioId: string, mode: "chat" | "voice") {
  const [grade, setGrade] = useState<Grade | null>(null);
  const [goodRec, setGoodRec] = useState("");
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");
  const run = async (turns: ChatTurn[]) => {
    setGrading(true); setError("");
    try {
      const r = await fetch("/api/roleplay/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId, mode, turns }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Grading failed");
      setGrade(j.grade); setGoodRec(j.goodRec);
    } catch (e) { setError((e as Error).message || "Grading failed. Try again."); }
    setGrading(false);
  };
  const reset = () => { setGrade(null); setError(""); };
  return { grade, goodRec, grading, error, run, reset };
}

function GradeReport({ grade, goodRec, onAgain }: { grade: Grade; goodRec: string; onAgain: () => void }) {
  const list = (title: string, items: string[]) => items.length > 0 && (
    <div><b>{title}</b><ul className="keypoints">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
  );
  return (
    <div className="stack" style={{ borderTop: "4px solid var(--red)", paddingTop: 16 }}>
      <div className="row spread"><h2>Coaching report</h2><span className="score" style={{ color: grade.score >= 7 ? "var(--good)" : "var(--bad)" }}>{grade.score}/10</span></div>
      {list("What you uncovered", grade.uncovered)}
      {list("What you missed", grade.missed)}
      {grade.recommendation && <div><b>Your recommendation</b><p style={{ margin: "4px 0 0" }}>{grade.recommendation}</p></div>}
      {list("Try this next time", grade.tips)}
      <details><summary className="link" style={{ cursor: "pointer" }}>See the ideal recommendation</summary><p>{goodRec}</p></details>
      <div><button className="btn primary" onClick={onAgain}>Try this call again</button></div>
    </div>
  );
}

function Transcript({ turns, live }: { turns: ChatTurn[]; live?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [turns.length, live]);
  return (
    <div className="chat" ref={ref}>
      {turns.map((m, i) => (
        <div key={i} className={`msg ${m.role === "customer" ? "cust" : "rep"}`}><span className="who">{m.role === "customer" ? "Customer" : "You"}</span>{m.text}</div>
      ))}
      {live !== undefined && <div className="msg cust"><span className="who">Customer</span>{live || "…"}</div>}
    </div>
  );
}

/* ─── Voice (ElevenLabs) ───────────────────────────────────────── */
function VoiceCall({ scenario }: { scenario: Scn }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [err, setErr] = useState("");
  const g = useGrader(scenario.id, "voice");
  const conv = useConversation({
    onConnect: () => {
      // The agent asks which scenario to run; answer for the trainee so the call starts in character.
      setTimeout(() => conv.sendUserMessage(`Scenario ${scenario.num}`), 400);
    },
    onMessage: (m) => {
      const text = m.message?.trim();
      if (!text) return;
      const role = m.source === "ai" ? "customer" : "rep";
      setTurns((prev) => [...prev, { role, text }]);
    },
    onError: (message) => setErr(typeof message === "string" ? message : "The call dropped. Try again."),
  });
  const live = conv.status === "connected" || conv.status === "connecting";

  const start = async () => {
    setErr(""); setTurns([]); g.reset();
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErr("Microphone access is blocked. Allow the microphone for this site and try again.");
      return;
    }
    const r = await fetch("/api/voice/session");
    const j = await r.json();
    if (!r.ok) { setErr(j.error || "Couldn't start the call."); return; }
    if (j.signedUrl) conv.startSession({ signedUrl: j.signedUrl });
    else conv.startSession({ agentId: j.agentId, connectionType: "webrtc" });
  };

  // Drop the setup lines ("Scenario 3", "which scenario…") before grading.
  const callTurns = () => {
    const i = turns.findIndex((m) => m.role === "rep" && /^scenario\s*\d+$/i.test(m.text));
    return i >= 0 ? turns.slice(i + 1) : turns;
  };

  if (g.grade) return <><Transcript turns={turns} /><GradeReport grade={g.grade} goodRec={g.goodRec} onAgain={() => { g.reset(); setTurns([]); }} /></>;

  return (
    <div className="stack">
      <div className="voice-stage">
        <div className={`voice-ring ${live ? (conv.isSpeaking ? "speaking" : "listening") : ""}`}>
          <span>{conv.status === "connecting" ? "Dialing…" : live ? (conv.isSpeaking ? "Customer talking" : "Your turn") : "Ready"}</span>
        </div>
        {!live ? (
          <button className="btn primary" onClick={start}>Start the call</button>
        ) : (
          <div className="row">
            <button className="btn" onClick={() => conv.setMuted(!conv.isMuted)}>{conv.isMuted ? "Unmute" : "Mute"}</button>
            <button className="btn dark" onClick={() => conv.endSession()}>End call</button>
          </div>
        )}
        <p className="small muted" style={{ margin: 0, maxWidth: 520 }}>
          Talk like it&apos;s a real customer call. Ask questions before you recommend anything. When you&apos;re done, end the call and get graded.
        </p>
      </div>
      {err && <div className="notice err">{err}</div>}
      {turns.length > 0 && <Transcript turns={turns} />}
      {!live && callTurns().filter((m) => m.role === "rep").length >= 2 && (
        <div className="row">
          <button className="btn primary" disabled={g.grading} onClick={() => g.run(callTurns())}>{g.grading ? "Grading…" : "Grade this call"}</button>
          {g.error && <span className="notice err">{g.error}</span>}
        </div>
      )}
    </div>
  );
}

/* ─── Chat ─────────────────────────────────────────────────────── */
function ChatCall({ scenario }: { scenario: Scn }) {
  const first: ChatTurn = { role: "customer", text: scenario.opening };
  const [turns, setTurns] = useState<ChatTurn[]>([first]);
  const [input, setInput] = useState("");
  const [live, setLive] = useState<string | undefined>(undefined);
  const [err, setErr] = useState("");
  const g = useGrader(scenario.id, "chat");
  const busy = live !== undefined || g.grading;
  const asked = turns.filter((m) => m.role === "rep").length;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...turns, { role: "rep" as const, text }];
    setTurns(next); setInput(""); setErr(""); setLive("");
    try {
      const r = await fetch("/api/roleplay/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: scenario.id, turns: next }) });
      if (!r.ok || !r.body) throw new Error(await r.text());
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); setLive(acc); }
      setTurns([...next, { role: "customer", text: acc.replace(/^customer:\s*/i, "").trim() || "(no answer)" }]);
    } catch {
      setTurns(turns); setInput(text);
      setErr("The customer didn't answer. Try sending again.");
    }
    setLive(undefined);
  };

  if (g.grade) return <><Transcript turns={turns} /><GradeReport grade={g.grade} goodRec={g.goodRec} onAgain={() => { g.reset(); setTurns([first]); }} /></>;

  return (
    <div className="stack">
      <Transcript turns={turns} live={live} />
      <form className="composer" onSubmit={send}>
        <textarea rows={2} value={input} disabled={busy} placeholder="Type what you'd say to the customer…" onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} />
        <button className="btn primary" disabled={busy || !input.trim()}>Send</button>
      </form>
      {err && <div className="notice err">{err}</div>}
      <div className="row spread">
        <span className="small muted">{asked} question{asked === 1 ? "" : "s"} asked</span>
        <button className="btn dark" disabled={asked < 2 || busy} onClick={() => g.run(turns)}>{g.grading ? "Grading…" : "End call & grade me"}</button>
      </div>
      {g.error && <div className="notice err">{g.error}</div>}
    </div>
  );
}
