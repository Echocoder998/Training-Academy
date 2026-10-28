import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { loadCatalog, loadMyResults, coursePct, courseDone, lessonsOf, lessonStatus } from "@/lib/data";
import { Band, Gauge, Pill } from "@/components/ui";
import { Certificate } from "@/components/Certificate";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const [{ courses, lessons }, { lessonMap }] = await Promise.all([loadCatalog(), loadMyResults(me.personId)]);
  const c = courses.find((x) => x.id === id);
  if (!c) notFound();
  const ls = lessonsOf(lessons, c.id);
  const next = ls.find((l) => !lessonMap[l.id]?.passed);
  const done = courseDone(lessons, c.id, lessonMap);
  const best = ls.map((l) => lessonMap[l.id]?.best ?? 0);
  const finished = ls.reduce((m, l) => Math.max(m, lessonMap[l.id]?.updatedAt?.getTime() ?? 0), 0);

  return (
    <>
      <Band eyebrow={c.category} title={c.title} right={<div style={{ background: "#fff", padding: 10 }}><Gauge pct={coursePct(lessons, c.id, lessonMap)} size={110} /></div>}>{c.summary}</Band>
      <main>
        <div className="row spread">
          <Link className="link" href="/">← All courses</Link>
          {next && <Link className="btn primary" href={`/lessons/${next.id}`}>{ls.some((l) => lessonMap[l.id]) ? "Continue" : "Start"}: {next.title}</Link>}
        </div>
        {done && (
          <Certificate courseTitle={c.title} defaultName={me.name} lessonCount={ls.length}
            avg={Math.round(best.reduce((a, b) => a + b, 0) / Math.max(1, best.length))} finishedAt={finished || Date.now()} />
        )}
        <div className="card">
          {ls.length === 0 && <p className="muted">No lessons in this course yet.</p>}
          {ls.map((l, i) => {
            const s = lessonStatus(lessonMap[l.id]);
            return (
              <div key={l.id} className="rowline">
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div className="t">
                  <Link className="link" href={`/lessons/${l.id}`}>{l.title}</Link>
                  <div className="small muted">{l.minutes ? `${l.minutes} min · ` : ""}{l.quiz.length} quiz questions{l.videoUrl || l.videoLink ? " · video" : ""}</div>
                </div>
                <Pill kind={s.key}>{s.label}</Pill>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
