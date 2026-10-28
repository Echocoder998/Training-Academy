"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { submitSpec } from "@/app/actions";

export function SpecChallenge({ id, application, options, nextId }: { id: string; application: string; options: string[]; nextId?: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const [res, setRes] = useState<{ correct: boolean; answer: number; why: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="card accent stack" onSubmit={(e) => { e.preventDefault(); if (pick != null) start(async () => setRes(await submitSpec(id, pick))); }}>
      <div className="brief"><p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{application}</p></div>
      <b>What would you quote?</b>
      <div>
        {options.map((o, j) => {
          let cls = "";
          if (res) { if (j === res.answer) cls = "right"; else if (pick === j) cls = "wrong"; }
          return (
            <label key={j} className={`opt ${cls}`}>
              <input type="radio" name="spec" checked={pick === j} disabled={!!res} onChange={() => setPick(j)} />
              <span>{o}</span>
            </label>
          );
        })}
      </div>
      {res && <div className={`notice ${res.correct ? "ok" : "err"}`}><b>{res.correct ? "Good call." : "Not quite."}</b> {res.why}</div>}
      <div className="row">
        {res ? (
          <>
            <button type="button" className="btn" onClick={() => { setRes(null); setPick(null); }}>Try again</button>
            {nextId && <Link className="btn primary" href={`/practice/specs/${nextId}`}>Next challenge</Link>}
          </>
        ) : <button className="btn primary" disabled={pick == null || pending}>{pending ? "Checking…" : "Check my answer"}</button>}
      </div>
    </form>
  );
}
