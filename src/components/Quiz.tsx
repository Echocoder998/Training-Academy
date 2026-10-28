"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitQuiz } from "@/app/actions";

type Q = { q: string; options: string[] };
type Result = { score: number; passed: boolean; answers: number[]; why: string[] };

export function Quiz({ lessonId, questions, passScore, best, attempts }: { lessonId: string; questions: Q[]; passScore: number; best: number | null; attempts: number }) {
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!questions.length) return <div className="card"><h3>Quiz</h3><p className="muted">No quiz for this lesson yet.</p></div>;

  if (!open) {
    return (
      <div className="card row spread">
        <div>
          <h3>Quiz · {questions.length} questions</h3>
          <p className="muted" style={{ margin: "4px 0 0" }}>Score {passScore}% or higher to pass.{attempts > 0 && best != null ? ` Your best: ${best}% in ${attempts} attempt${attempts === 1 ? "" : "s"}.` : ""}</p>
        </div>
        <button className="btn primary" onClick={() => { setOpen(true); setPicks({}); setResult(null); }}>{attempts ? "Retake quiz" : "Start quiz"}</button>
      </div>
    );
  }

  const answered = Object.keys(picks).length;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      try {
        const r = await submitQuiz(lessonId, questions.map((_, i) => picks[i] ?? -1));
        setResult(r);
        router.refresh();
      } catch {
        setError("Your answers couldn't be saved. Check your connection and try again.");
      }
    });
  };

  return (
    <form className="card accent stack" onSubmit={submit}>
      <div className="row spread">
        <h3>Quiz</h3>
        {result ? (
          <div className="row">
            <span className="score" style={{ color: result.passed ? "var(--good)" : "var(--bad)" }}>{result.score}%</span>
            <span className={`pill ${result.passed ? "pass" : "fail"}`}>{result.passed ? "Passed" : `Not passed · need ${passScore}%`}</span>
          </div>
        ) : <span className="small muted">{answered} / {questions.length} answered</span>}
      </div>
      {questions.map((q, i) => (
        <fieldset key={i} className="q" style={{ border: 0, margin: 0, padding: 0 }}>
          <p>{i + 1}. {q.q}</p>
          {q.options.map((o, j) => {
            let cls = "";
            if (result) { if (j === result.answers[i]) cls = "right"; else if (picks[i] === j) cls = "wrong"; }
            return (
              <label key={j} className={`opt ${cls}`}>
                <input type="radio" name={`q${i}`} checked={picks[i] === j} disabled={!!result} onChange={() => setPicks({ ...picks, [i]: j })} />
                <span>{o}</span>
              </label>
            );
          })}
          {result && result.why[i] && (
            <p className="why"><b>{picks[i] === result.answers[i] ? "Correct." : `Answer: ${q.options[result.answers[i]]}.`}</b> {result.why[i]}</p>
          )}
        </fieldset>
      ))}
      {error && <div className="notice err">{error}</div>}
      <div className="row">
        {result ? (
          <>
            <button type="button" className="btn primary" onClick={() => { setPicks({}); setResult(null); }}>Retake</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Close</button>
          </>
        ) : (
          <>
            <button className="btn primary" disabled={answered < questions.length || pending}>{pending ? "Checking…" : "Submit answers"}</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
          </>
        )}
      </div>
    </form>
  );
}
