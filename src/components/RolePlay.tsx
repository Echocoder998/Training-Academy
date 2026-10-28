"use client";
import { useRef, useState, useEffect } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { ChatTurn, Grade } from "@/db/schema";

type Scn = { id: string; num: number; opening: string };
type Level = "beginner" | "experienced";

export const LEVEL_INFO: Record<Level, { label: string; blurb: string }> = {
  beginner: { label: "Beginner", blurb: "Short, friendly call. Ask 3 to 5 questions (what it's for, pressure, where it's mounted, how many), then recommend something." },
  experienced: { label: "Experienced", blurb: "Busy, realistic customer who only shares details when asked and pushes back on weak recommendations." },
};

export function RolePlay({ scenario, initialMode, initialLevel }: { scenario: Scn; initialMode: "voice" | "chat"; initialLevel: Level }) {
  const [mode, setMode] = useState(initialMode);
  const [level, setLevel] = useState<Level>(initialLevel);
  const [busy, setBusy] = useState(false);
  return (
    <div className="card stack" style={{ gap: 16 }}>
      <div className="row spread">
        <div className="tabs" role="tablist" style={{ flex: 1 }}>
          <button role="tab" aria-selected={mode === "voice"} disabled={busy} onClick={() => setMode("voice")}>Voice call</button>
          <button role="tab" aria-selected={mode === "chat"} disabled={busy} onClick={() => setMode("chat")}>Chat</button>
        </div>
        <div className="chips" role="group" aria-label="Difficulty">
          {(["beginner", "experienced"] as Level[]).map((l) => (
            <button key={l} className="chip" aria-pressed={level === l} disabled={busy} onClick={() => setLevel(l)}>{LEVEL_INFO[l].label}</button>
          ))}
        </div>
      </div>
      <p className="small muted" style={{ margin: 0 }}><b>{LEVEL_INFO[level].label}:</b> {LEVEL_INFO[level].blurb}</p>
      {mode === "voice"
        ? <ConversationProvider><VoiceCall key={level} scenario={scenario} level={level} onBusy={setBusy} /></ConversationProvider>
        : <ChatCall key={level} scenario={scenario} level={level} onBusy={setBusy} />}
    </div>
  );
}

/* ─── Shared grading ───────────────────────────────────────────── */
function useGrader(scenarioId: string, mode: "chat" | "voice", level: Level) {
  const [grade, setGrade] = useState<Grade | null>(null);
  const [goodRec, setGoodRec] = useState("");
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");
  const run = async (turns: ChatTurn[]) => {
    setGrading(true); setError("");
    try {
      const r = await fetch("/api/roleplay/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId, mode, turns, level }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Grading failed");
      setGrade(j.grade); setGoodRec(j.goodRec);
    } catch (e) { setError((e as Error).message || "Grading failed. Try again."); }
    setGrading(false);
  };
  const reset = () => { setGrade(null); setError(""); };
  return { grade, goodRec, grading, error, run, reset };
}

function GradeReport({ grade, goodRec, onAgain, spoken }: { grade: Grade; goodRec: string; onAgain: () => void; spoken?: string }) {
  const list = (title: string, items: string[]) => items.length > 0 && (
    <div><b>{title}</b><ul className="keypoints">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
  );
  return (
    <div className="stack" style={{ borderTop: "4px solid var(--red)", paddingTop: 16 }}>
      <div className="row spread"><h2>Coaching report</h2><span className="score" style={{ color: grade.score >= 7 ? "var(--good)" : "var(--bad)" }}>{grade.score}/10</span></div>
      {spoken && (
        <div className="brief"><b>What your coach said on the call</b><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{spoken}</p></div>
      )}
      {list("What you uncovered", grade.uncovered)}
      {list("What you missed", grade.missed)}
      {grade.recommendation && <div><b>Your recommendation</b><p style={{ margin: "4px 0 0" }}>{grade.recommendation}</p></div>}
      {list("Try this next time", grade.tips)}
      <details><summary className="link" style={{ cursor: "pointer" }}>See the ideal recommendation</summary><p>{goodRec}</p></details>
      <div><button className="btn primary" onClick={onAgain}>Try this call again</button></div>
    </div>
  );
}

function Transcript({ turns, live, coachFrom }: { turns: ChatTurn[]; live?: string; coachFrom?: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [turns.length, live]);
  return (
    <div className="chat" ref={ref}>
      {turns.map((m, i) => (
        <div key={i} className={`msg ${m.role === "customer" ? "cust" : "rep"}`}><span className="who">{m.role === "customer" ? (coachFrom != null && i > coachFrom ? "Coach" : "Customer") : "You"}</span>{m.text}</div>
      ))}
      {live !== undefined && <div className="msg cust"><span className="who">Customer</span>{live || "…"}</div>}
    </div>
  );
}

/* ─── Voice (ElevenLabs) ───────────────────────────────────────── */
const COACH_CUE = /\b(feedback|how did i do|end (the )?call|coach me)\b/i;

function VoiceCall({ scenario, level, onBusy }: { scenario: Scn; level: Level; onBusy: (b: boolean) => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [err, setErr] = useState("");
  const [coachAt, setCoachAt] = useState<number | null>(null); // index of the turn where coaching starts
  const [ending, setEnding] = useState(false);
  const turnsRef = useRef<ChatTurn[]>([]);
  const coachRef = useRef<number | null>(null);
  const g = useGrader(scenario.id, "voice", level);

  const markCoaching = (index: number) => {
    if (coachRef.current === null) { coachRef.current = index; setCoachAt(index); }
  };

  const conv = useConversation({
    onConnect: () => {
      // The agent asks which scenario to run; answer for the trainee so the call starts in character.
      setTimeout(() => conv.sendUserMessage(`Scenario ${scenario.num}, ${level} level`), 400);
    },
    onMessage: (m) => {
      const text = m.message?.trim();
      if (!text) return;
      const role = m.source === "ai" ? "customer" : "rep";
      const next = [...turnsRef.current, { role, text } as ChatTurn];
      turnsRef.current = next;
      setTurns(next);
      // Trainee asked for feedback out loud: everything after this is coaching, not the sales call.
      if (role === "rep" && COACH_CUE.test(text)) markCoaching(next.length - 1);
    },
    onError: (message) => setErr(typeof message === "string" ? message : "The call dropped. Try again."),
  });
  const live = conv.status === "connected" || conv.status === "connecting";
  useEffect(() => { onBusy(live); }, [live, onBusy]);

  const reset = () => { turnsRef.current = []; coachRef.current = null; setTurns([]); setCoachAt(null); setEnding(false); g.reset(); };

  const start = async () => {
    setErr(""); reset();
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

  /** Only the sales conversation: after the "Scenario N" setup line and before coaching starts. */
  const callTurns = (all = turnsRef.current) => {
    const s0 = all.findIndex((m) => m.role === "rep" && /^scenario\s*\d+/i.test(m.text));
    const end = coachRef.current ?? all.length;
    return all.slice(s0 >= 0 ? s0 + 1 : 0, end);
  };
  const spokenCoaching = () =>
    coachRef.current === null ? "" : turnsRef.current.slice(coachRef.current + 1).filter((m) => m.role === "customer").map((m) => m.text).join("\n\n");
  const repCount = callTurns(turns).filter((m) => m.role === "rep").length;

  const askCoaching = () => {
    markCoaching(turnsRef.current.length - 1);
    conv.sendUserMessage("feedback");
  };

  const endAndGrade = async () => {
    setEnding(true);
    conv.endSession();
    await new Promise((r) => setTimeout(r, 800)); // let the last transcript lines arrive
    setEnding(false);
    if (callTurns().filter((m) => m.role === "rep").length >= 2) g.run(callTurns());
  };

  if (g.grade) {
    return <><Transcript turns={turns} coachFrom={coachAt} /><GradeReport grade={g.grade} goodRec={g.goodRec} spoken={spokenCoaching()} onAgain={reset} /></>;
  }

  return (
    <div className="stack">
      <div className="voice-stage">
        <div className={`voice-ring ${live ? (conv.isSpeaking ? "speaking" : "listening") : ""}`}>
          <span>{conv.status === "connecting" ? "Dialing…" : live ? (conv.isSpeaking ? (coachAt !== null ? "Coach talking" : "Customer talking") : "Your turn") : g.grading || ending ? "Grading…" : "Ready"}</span>
        </div>
        {!live ? (
          <button className="btn primary" onClick={start} disabled={g.grading || ending}>{turns.length ? "Start a new call" : "Start the call"}</button>
        ) : (
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => conv.setMuted(!conv.isMuted)}>{conv.isMuted ? "Unmute" : "Mute"}</button>
            {coachAt === null && <button className="btn" onClick={askCoaching} disabled={repCount < 2}>Get coaching</button>}
            <button className={`btn ${coachAt !== null ? "primary" : "dark"}`} onClick={endAndGrade}>End call &amp; see my grade</button>
          </div>
        )}
        <p className="small muted" style={{ margin: 0, maxWidth: 540 }}>
          {coachAt !== null
            ? "Your coach is giving feedback on the call. Listen, then end the call to see your written grade."
            : "Talk like it's a real customer call. Ask questions before you recommend anything. When you're done, click Get coaching (or say \"feedback\") to hear what to improve, then end the call for your grade."}
        </p>
      </div>
      {err && <div className="notice err">{err}</div>}
      {turns.length > 0 && <Transcript turns={turns} coachFrom={coachAt} />}
      {!live && !g.grading && turns.length > 0 && (
        repCount >= 2
          ? <div className="row"><button className="btn primary" onClick={() => g.run(callTurns())}>Grade this call</button>{g.error && <span className="notice err">{g.error}</span>}</div>
          : <div className="notice">Ask the customer at least two questions before ending the call to get a grade.</div>
      )}
    </div>
  );
}

/* ─── Chat ─────────────────────────────────────────────────────── */
function ChatCall({ scenario, level, onBusy }: { scenario: Scn; level: Level; onBusy: (b: boolean) => void }) {
  const first: ChatTurn = { role: "customer", text: scenario.opening };
  const [turns, setTurns] = useState<ChatTurn[]>([first]);
  const [input, setInput] = useState("");
  const [live, setLive] = useState<string | undefined>(undefined);
  const [err, setErr] = useState("");
  const g = useGrader(scenario.id, "chat", level);
  const busy = live !== undefined || g.grading;
  const asked = turns.filter((m) => m.role === "rep").length;
  useEffect(() => { onBusy(asked > 0 && !g.grade); }, [asked, g.grade, onBusy]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...turns, { role: "rep" as const, text }];
    setTurns(next); setInput(""); setErr(""); setLive("");
    try {
      const r = await fetch("/api/roleplay/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: scenario.id, turns: next, level }) });
      if (!r.ok || !r.body) throw new Error(await r.text());
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); setLive(acc); }
      const reply = acc.replace(/^customer:\s*/i, "").trim();
      if (!reply) throw new Error("empty");
      setTurns([...next, { role: "customer", text: reply }]);
    } catch {
      setTurns(turns); setInput(text);
      setErr("The customer didn't answer. Your message is back in the box. Click Send to try again.");
    }
    setLive(undefined);
  };

  const lastCustomer = [...turns].reverse().find((m) => m.role === "customer")?.text ?? "";
  const wrapped = asked >= 2 && /send (me )?(a |the )?quote|talk soon/i.test(lastCustomer);

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
      {wrapped && !busy && <div className="notice">The customer wrapped up the call. Click <b>End call &amp; grade me</b> to see how you did.</div>}
      <div className="row spread">
        <span className="small muted">{asked} question{asked === 1 ? "" : "s"} asked</span>
        <button className={`btn ${wrapped ? "primary" : "dark"}`} disabled={asked < 2 || busy} onClick={() => g.run(turns)}>{g.grading ? "Grading…" : "End call & grade me"}</button>
      </div>
      {g.error && <div className="notice err">{g.error}</div>}
    </div>
  );
}
