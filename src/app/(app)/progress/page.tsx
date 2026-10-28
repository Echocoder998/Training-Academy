import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/session";
import { loadCatalog, loadMyResults, lessonsOf, lessonStatus, courseDone, fmtDate } from "@/lib/data";
import { Band, Gauge, Pill } from "@/components/ui";
import { setMyName } from "@/app/actions";

export default async function ProgressPage() {
  const me = await requireUser();
  const [{ courses, lessons, paths }, { person, lessonMap }] = await Promise.all([loadCatalog(), loadMyResults(me.personId)]);
  const calls = await db().select({ id: t.roleplayAttempts.id, score: t.roleplayAttempts.score, mode: t.roleplayAttempts.mode, at: t.roleplayAttempts.createdAt, title: t.scenarios.title, num: t.scenarios.num, sid: t.scenarios.id })
    .from(t.roleplayAttempts).innerJoin(t.scenarios, eq(t.scenarios.id, t.roleplayAttempts.scenarioId))
    .where(eq(t.roleplayAttempts.personId, me.personId)).orderBy(desc(t.roleplayAttempts.createdAt)).limit(20);
  const path = paths.find((p) => p.id === person?.pathId);
  const req = new Set(path?.courseIds ?? []);

  return (
    <>
      <Band eyebrow="My progress" title={me.name} />
      <main>
        {me.testMode && (
          <form className="card row" action={setMyName}>
            <label className="f" style={{ flex: 1, minWidth: 220 }}>Your name (shows on Team Results)<input name="name" defaultValue={me.name} maxLength={60} required /></label>
            <button className="btn primary" style={{ alignSelf: "flex-end" }}>Save name</button>
          </form>
        )}
        {calls.length > 0 && (
          <div className="card accent">
            <h3 style={{ marginBottom: 6 }}>Recent practice calls</h3>
            {calls.map((c) => (
              <div key={c.id} className="rowline">
                <span className="n">#{c.num}</span>
                <div className="t"><Link className="link" href={`/practice/roleplay/${c.sid}?mode=${c.mode}`}>{c.title}</Link><div className="small muted">{c.mode === "voice" ? "Voice" : "Chat"} · {fmtDate(c.at)}</div></div>
                <Pill kind={c.score >= 7 ? "pass" : "fail"}>{c.score}/10</Pill>
              </div>
            ))}
          </div>
        )}
        {courses.map((c) => {
          const ls = lessonsOf(lessons, c.id);
          return (
            <div key={c.id} className="card stack">
              <div className="row spread">
                <div className="row"><h3>{c.title}</h3>{req.has(c.id) && <Pill kind="req">Required</Pill>}</div>
                <Gauge pct={ls.length ? Math.round((100 * ls.filter((l) => lessonMap[l.id]?.passed).length) / ls.length) : 0} />
              </div>
              {courseDone(lessons, c.id, lessonMap) && <div><Link className="btn sm" href={`/courses/${c.id}`}>Get certificate</Link></div>}
              <div>
                {ls.map((l) => { const s = lessonStatus(lessonMap[l.id]); return (
                  <div key={l.id} className="rowline"><div className="t"><Link className="link" href={`/lessons/${l.id}`}>{l.title}</Link></div>
                    <span className="small muted">{fmtDate(lessonMap[l.id]?.updatedAt)}</span><Pill kind={s.key}>{s.label}</Pill></div>
                ); })}
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}
