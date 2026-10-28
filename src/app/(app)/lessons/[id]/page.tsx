import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { loadCatalog, loadMyResults, lessonsOf, lessonStatus } from "@/lib/data";
import { Band, Pill } from "@/components/ui";
import { Quiz } from "@/components/Quiz";
import { LessonVideo } from "@/components/LessonVideo";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const [{ courses, lessons }, { lessonMap }] = await Promise.all([loadCatalog(), loadMyResults(me.personId)]);
  const l = lessons.find((x) => x.id === id);
  if (!l) notFound();
  const c = courses.find((x) => x.id === l.courseId);
  const ls = lessonsOf(lessons, l.courseId);
  const idx = ls.findIndex((x) => x.id === l.id);
  const r = lessonMap[l.id];
  const s = lessonStatus(r);
  const points = l.keyPoints.split("\n").map((p) => p.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  // Strip answers before sending the quiz to the browser.
  const publicQuiz = l.quiz.map((q) => ({ q: q.q, options: q.options }));

  return (
    <>
      <Band eyebrow={`${c?.title ?? "Course"} · Lesson ${idx + 1} of ${ls.length}${l.minutes ? ` · ${l.minutes} min` : ""}`} title={l.title} right={<Pill kind={s.key}>{s.label}</Pill>} />
      <main>
        <div className="row spread">
          <Link className="link" href={`/courses/${l.courseId}`}>← {c?.title ?? "Course"}</Link>
          {me.role === "admin" && <Link className="btn sm" href={`/admin/content/lessons/${l.id}`}>Edit lesson</Link>}
        </div>
        <div className="card">
          <LessonVideo lessonId={l.id} videoUrl={l.videoUrl} videoLink={l.videoLink} watched={!!r?.watched} isAdmin={me.role === "admin"} />
        </div>
        {points.length > 0 && (
          <div className="card accent stack">
            <h3>Key points</h3>
            <ul className="keypoints">{points.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        )}
        <Quiz lessonId={l.id} questions={publicQuiz} passScore={l.passScore} best={r?.best ?? null} attempts={r?.attempts ?? 0} />
        <div className="row spread">
          {idx > 0 ? <Link className="btn" href={`/lessons/${ls[idx - 1].id}`}>← {ls[idx - 1].title}</Link> : <span />}
          {idx < ls.length - 1 && <Link className="btn" href={`/lessons/${ls[idx + 1].id}`}>{ls[idx + 1].title} →</Link>}
        </div>
      </main>
    </>
  );
}
