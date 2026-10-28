"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload, uploadPresigned } from "@vercel/blob/client";
import { saveLesson } from "@/app/admin-actions";
import type { QuizQuestion } from "@/db/schema";

type Draft = {
  id: string; courseId: string; title: string; order: number | null; minutes: number | null; passScore: number;
  keyPoints: string; videoUrl: string | null; videoLink: string | null; quiz: QuizQuestion[];
};
type EditQ = { q: string; options: string[]; answer: number | null; why: string };

export function LessonEditor({ courses, initial, aiReady, blobMode }: { courses: { id: string; title: string }[]; initial: Draft; aiReady: boolean; blobMode: "token" | "presigned" | null }) {
  const blobReady = blobMode !== null;
  const router = useRouter();
  const [d, setD] = useState<Draft>(initial);
  const [qs, setQs] = useState<EditQ[]>(initial.quiz.map((q) => ({ q: q.q, options: [0, 1, 2, 3].map((i) => q.options[i] ?? ""), answer: q.answer, why: q.why ?? "" })));
  const [msg, setMsg] = useState<{ text: string; kind: "" | "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMsg({ text: "Uploading video…", kind: "" }); setProgress(0);
    try {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const opts = { access: "public" as const, handleUploadUrl: "/api/upload", multipart: f.size > 50 * 1024 * 1024, onUploadProgress: (p: { percentage: number }) => setProgress(Math.round(p.percentage)) };
      const blob = blobMode === "token"
        ? await upload(`lessons/${safe}`, f, opts)
        : await uploadPresigned(`lessons/${Date.now()}-${safe}`, f, opts);
      set("videoUrl", blob.url);
      setMsg({ text: "Video uploaded. Save the lesson to keep it.", kind: "ok" });
    } catch (e) {
      setMsg({ text: `Upload failed: ${(e as Error).message}`, kind: "err" });
    }
    setProgress(null);
  };

  const writeQuiz = async () => {
    setBusy(true); setMsg({ text: "Writing questions…", kind: "" });
    try {
      const r = await fetch("/api/ai/quiz", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseTitle: courses.find((c) => c.id === d.courseId)?.title ?? "", lessonTitle: d.title, keyPoints: d.keyPoints }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const add: EditQ[] = (j.questions as QuizQuestion[]).map((q) => ({ q: q.q, options: [0, 1, 2, 3].map((i) => q.options[i] ?? ""), answer: q.answer, why: q.why ?? "" }));
      setQs((x) => [...x.filter((q) => q.q), ...add]);
      setMsg({ text: `Added ${add.length} questions. Check every answer before you save.`, kind: "ok" });
    } catch (e) { setMsg({ text: (e as Error).message || "AI request failed.", kind: "err" }); }
    setBusy(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const quiz: QuizQuestion[] = [];
    for (const [i, q] of qs.entries()) {
      if (!q.q && !q.options.some(Boolean)) continue;
      const keep = q.options.map((o, j) => [o.trim(), j] as const).filter(([o]) => o);
      const answer = keep.findIndex(([, j]) => j === q.answer);
      if (!q.q.trim() || keep.length < 2) return setMsg({ text: `Question ${i + 1} needs the question text and at least two options.`, kind: "err" });
      if (answer < 0) return setMsg({ text: `Question ${i + 1}: select the circle next to the correct option.`, kind: "err" });
      quiz.push({ q: q.q.trim(), options: keep.map(([o]) => o), answer, why: q.why.trim() });
    }
    setBusy(true);
    const r = await saveLesson({ ...d, id: d.id || undefined, videoLink: d.videoLink || null, quiz });
    setBusy(false);
    if ("error" in r && r.error) return setMsg({ text: r.error, kind: "err" });
    router.push("/admin/content?tab=courses&saved=1");
    router.refresh();
  };

  const setQ = (i: number, patch: Partial<EditQ>) => setQs((x) => x.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <form className="stack" onSubmit={save} style={{ gap: 16 }}>
      <div className="card stack">
        <div className="form">
          <label className="f wide">Title<input required value={d.title} onChange={(e) => set("title", e.target.value)} /></label>
          <label className="f">Course<select value={d.courseId} onChange={(e) => set("courseId", e.target.value)}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          <label className="f">Order in course<input type="number" value={d.order ?? ""} onChange={(e) => set("order", num(e.target.value))} /></label>
          <label className="f">Length (min)<input type="number" min={0} value={d.minutes ?? ""} onChange={(e) => set("minutes", num(e.target.value))} /></label>
          <label className="f">Passing score (%)<input type="number" min={1} max={100} value={d.passScore} onChange={(e) => set("passScore", Number(e.target.value) || 80)} /></label>
          <label className="f wide">Key points (one per line)<textarea rows={8} value={d.keyPoints} onChange={(e) => set("keyPoints", e.target.value)} /></label>
        </div>
      </div>

      <div className="card stack">
        <h3>Video</h3>
        {d.videoUrl && <><video className="video" controls preload="metadata" src={d.videoUrl} /><div><button type="button" className="btn sm" onClick={() => set("videoUrl", null)}>Remove video</button></div></>}
        {blobReady
          ? <label className="f">Upload a video (MP4 recommended, up to 2 GB)<input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={progress !== null} onChange={(e) => onFile(e.target.files?.[0])} /></label>
          : <p className="small muted" style={{ margin: 0 }}>Video upload turns on once a Vercel Blob store is connected to the project.</p>}
        {progress !== null && <div className="small">Uploading… {progress}%</div>}
        <label className="f">Or link to a video hosted elsewhere (YouTube, SharePoint, Stream)<input type="url" placeholder="https://" value={d.videoLink ?? ""} onChange={(e) => set("videoLink", e.target.value)} /></label>
      </div>

      <div className="card stack">
        <div className="row spread">
          <h3>Quiz questions</h3>
          <div className="row">
            {aiReady && <button type="button" className="btn" disabled={busy || !d.keyPoints.trim()} onClick={writeQuiz}>Write 4 questions with AI</button>}
            <button type="button" className="btn" onClick={() => setQs((x) => [...x, { q: "", options: ["", "", "", ""], answer: null, why: "" }])}>Add question</button>
          </div>
        </div>
        {qs.length === 0 && <p className="muted" style={{ margin: 0 }}>No questions yet. Select the circle next to the correct option.</p>}
        {qs.map((q, i) => (
          <div key={i} className="qe">
            <div className="row spread"><b>Question {i + 1}</b><button type="button" className="link" onClick={() => setQs((x) => x.filter((_, j) => j !== i))}>Remove</button></div>
            <input placeholder="Question" value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} />
            {q.options.map((o, j) => (
              <div key={j} className="optline">
                <input type="radio" name={`ans${i}`} checked={q.answer === j} onChange={() => setQ(i, { answer: j })} aria-label={`Option ${j + 1} is correct`} />
                <input placeholder={`Option ${j + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} />
              </div>
            ))}
            <input placeholder="Why this answer is right (shown after submitting)" value={q.why} onChange={(e) => setQ(i, { why: e.target.value })} />
          </div>
        ))}
      </div>

      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
      <div className="row"><button className="btn primary" disabled={busy || progress !== null}>{busy ? "Working…" : "Save lesson"}</button></div>
    </form>
  );
}
