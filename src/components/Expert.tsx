"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

type Turn = { role: "user" | "expert"; text: string };

const STARTERS = [
  "Which ABB meter for steam when there's almost no straight pipe?",
  "When do I recommend Coriolis instead of a mag meter?",
  "How do I answer 'Coriolis is too expensive'?",
  "What should I ask a customer before quoting a SensyMaster?",
  "What's the difference between FSV430 and FSV450?",
  "What else should I quote with a flowmeter?",
];

export function Expert({ initialMode }: { initialMode: "chat" | "voice" }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  return (
    <div className="card stack" style={{ gap: 16 }}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === "chat"} disabled={busy} onClick={() => setMode("chat")}>Chat</button>
        <button role="tab" aria-selected={mode === "voice"} disabled={busy} onClick={() => setMode("voice")}>Voice</button>
      </div>
      {mode === "chat" ? <ExpertChat /> : <ConversationProvider><ExpertVoice onBusy={setBusy} /></ConversationProvider>}
    </div>
  );
}

/** Light formatting for the expert's replies: **bold** and "- " bullet lines. */
function Rich({ text }: { text: string }) {
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  const lines = text.split("\n");
  return (
    <>
      {lines.map((l, i) => {
        const m = l.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)$/);
        return m
          ? <div key={i} style={{ paddingLeft: 14, textIndent: -10 }}>• {bold(m[1])}</div>
          : l.trim() ? <div key={i}>{bold(l)}</div> : <div key={i} style={{ height: 8 }} />;
      })}
    </>
  );
}

function Thread({ turns, live }: { turns: Turn[]; live?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [turns.length, live]);
  return (
    <div className="chat" ref={ref}>
      {turns.map((m, i) => (
        <div key={i} className={`msg ${m.role === "expert" ? "cust" : "rep"}`}>
          <span className="who">{m.role === "expert" ? "ABB Expert" : "You"}</span>
          {m.role === "expert" ? <Rich text={m.text} /> : m.text}
        </div>
      ))}
      {live !== undefined && <div className="msg cust"><span className="who">ABB Expert</span>{live ? <Rich text={live} /> : "…"}</div>}
    </div>
  );
}

/* ─── Chat ─────────────────────────────────────────────────────── */
function ExpertChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [live, setLive] = useState<string | undefined>(undefined);
  const [err, setErr] = useState("");
  const busy = live !== undefined;

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setErr("");
    const next = [...turns, { role: "user", text } as Turn];
    setTurns(next); setInput(""); setLive("");
    try {
      const r = await fetch("/api/expert/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turns: next }) });
      if (!r.ok || !r.body) throw new Error(await r.text().catch(() => "") || "The expert couldn't answer.");
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); setLive(acc); }
      if (!acc.trim()) throw new Error("The expert didn't answer. Try asking again.");
      setTurns([...next, { role: "expert", text: acc.trim() }]);
    } catch (e) {
      setTurns(turns); setInput(text);
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLive(undefined);
    }
  };

  return (
    <div className="stack">
      {turns.length === 0 && live === undefined ? (
        <div className="stack" style={{ gap: 8 }}>
          <b>Try asking</b>
          <div className="chips">
            {STARTERS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
          </div>
        </div>
      ) : <Thread turns={turns} live={live} />}
      <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <textarea rows={2} value={input} disabled={busy} placeholder="Ask the ABB Expert…" onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} />
        <button className="btn primary" disabled={busy || !input.trim()}>Ask</button>
      </form>
      {err && <div className="notice err">{err}</div>}
      {turns.length > 0 && !busy && <div><button className="btn sm" onClick={() => { setTurns([]); setErr(""); }}>New conversation</button></div>}
    </div>
  );
}

/* ─── Voice (ElevenLabs) ───────────────────────────────────────── */
function ExpertVoice({ onBusy }: { onBusy: (b: boolean) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [err, setErr] = useState("");
  const turnsRef = useRef<Turn[]>([]);
  const conv = useConversation({
    onMessage: (m) => {
      const text = m.message?.trim();
      if (!text) return;
      const next = [...turnsRef.current, { role: m.source === "ai" ? "expert" : "user", text } as Turn];
      turnsRef.current = next; setTurns(next);
    },
    onError: (message) => setErr(typeof message === "string" ? message : "The call dropped. Try again."),
  });
  const live = conv.status === "connected" || conv.status === "connecting";
  useEffect(() => { onBusy(live); }, [live, onBusy]);

  const start = async () => {
    setErr(""); turnsRef.current = []; setTurns([]);
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setErr("Microphone access is blocked. Allow the microphone for this site and try again."); return; }
    const r = await fetch("/api/voice/session?agent=expert");
    const j = await r.json();
    if (!r.ok) { setErr(j.error || "Couldn't connect to the expert."); return; }
    if (j.signedUrl) conv.startSession({ signedUrl: j.signedUrl });
    else conv.startSession({ agentId: j.agentId, connectionType: "webrtc" });
  };

  return (
    <div className="stack">
      <div className="voice-stage">
        <div className={`voice-ring ${live ? (conv.isSpeaking ? "speaking" : "listening") : ""}`}>
          <span>{conv.status === "connecting" ? "Connecting…" : live ? (conv.isSpeaking ? "Expert talking" : "Your turn") : "Ready"}</span>
        </div>
        {!live ? (
          <button className="btn primary" onClick={start}>{turns.length ? "Ask something else" : "Talk to the ABB Expert"}</button>
        ) : (
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => conv.setMuted(!conv.isMuted)}>{conv.isMuted ? "Unmute" : "Mute"}</button>
            <button className="btn dark" onClick={() => conv.endSession()}>End</button>
          </div>
        )}
        <p className="small muted" style={{ margin: 0, maxWidth: 540 }}>
          Ask out loud, like you&apos;d ask a senior ABB specialist. For example: &quot;My customer needs steam flow after an elbow. What should I quote?&quot;
        </p>
      </div>
      {err && <div className="notice err">{err}</div>}
      {turns.length > 0 && <Thread turns={turns} />}
    </div>
  );
}
