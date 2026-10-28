import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, t } from "@/db";
import type { LessonResult } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { loadCatalog, pathInfo, fmtDate } from "@/lib/data";
import { Band, Pill } from "@/components/ui";
import { setRole } from "@/app/admin-actions";

export default async function TeamPage() {
  const me = await requireAdmin();
  const d = db();
  const [{ courses, lessons, paths }, people, lr, rp, sr, recent] = await Promise.all([
    loadCatalog(),
    d.select().from(t.people).orderBy(asc(t.people.name)),
    d.select().from(t.lessonResults),
    d.select({ personId: t.roleplayAttempts.personId, avg: sql<number>`round(avg(${t.roleplayAttempts.score})::numeric, 1)::float`, n: sql<number>`count(*)::int` }).from(t.roleplayAttempts).groupBy(t.roleplayAttempts.personId),
    d.select({ personId: t.specResults.personId, ok: sql<number>`count(*) filter (where ${t.specResults.correct})::int` }).from(t.specResults).groupBy(t.specResults.personId),
    d.select({ id: t.roleplayAttempts.id, score: t.roleplayAttempts.score, mode: t.roleplayAttempts.mode, level: t.roleplayAttempts.level, at: t.roleplayAttempts.createdAt, name: t.people.name, email: t.people.email, title: t.scenarios.title, num: t.scenarios.num })
      .from(t.roleplayAttempts).innerJoin(t.people, eq(t.people.id, t.roleplayAttempts.personId)).innerJoin(t.scenarios, eq(t.scenarios.id, t.roleplayAttempts.scenarioId))
      .orderBy(desc(t.roleplayAttempts.createdAt)).limit(15),
  ]);
  const specCount = (await d.select({ n: sql<number>`count(*)::int` }).from(t.specs))[0].n;
  const ordered = courses.flatMap((c) => lessons.filter((l) => l.courseId === c.id));
  const byPerson: Record<string, Record<string, LessonResult>> = {};
  for (const r of lr) (byPerson[r.personId] ??= {})[r.lessonId] = r;
  const rpMap = Object.fromEntries(rp.map((r) => [r.personId, r]));
  const srMap = Object.fromEntries(sr.map((r) => [r.personId, r.ok]));

  return (
    <>
      <Band eyebrow="Managers" title="Team results">Best quiz score per lesson, learning path status, and practice-call scores for everyone who has signed in.</Band>
      <main>
        <div className="card tablewrap">
          <table>
            <thead><tr>
              <th>Person</th><th>Path</th><th>Passed</th><th>Avg quiz</th><th>Calls (avg)</th><th>Specs</th><th>Last active</th><th>Access</th>
              {ordered.map((l) => <th key={l.id} title={l.title}>{l.title.length > 16 ? l.title.slice(0, 15) + "…" : l.title}</th>)}
            </tr></thead>
            <tbody>
              {people.map((p) => {
                const L = byPerson[p.id] ?? {};
                const tried = Object.values(L).filter((r) => r.attempts > 0);
                const avg = tried.length ? Math.round(tried.reduce((a, r) => a + r.best, 0) / tried.length) : null;
                const path = paths.find((x) => x.id === p.pathId);
                const pi = path ? pathInfo(path, p, courses, lessons, L) : null;
                return (
                  <tr key={p.id}>
                    <td><b>{p.name || p.email}</b><div className="small muted">{p.email}</div></td>
                    <td>{path && pi ? <>{path.name} <span className="small muted">{pi.done}/{pi.total}</span> {pi.overdue ? <Pill kind="fail">Overdue</Pill> : pi.due ? <span className="small muted">due {fmtDate(pi.due)}</span> : null}</> : <span className="muted">Not set</span>}</td>
                    <td className="num">{lessons.filter((l) => L[l.id]?.passed).length} / {lessons.length}</td>
                    <td className="num">{avg == null ? "—" : `${avg}%`}</td>
                    <td className="num">{rpMap[p.id] ? `${rpMap[p.id].n} (${rpMap[p.id].avg})` : "—"}</td>
                    <td className="num">{srMap[p.id] ?? 0} / {specCount}</td>
                    <td className="num">{fmtDate(p.lastActive)}</td>
                    <td>
                      <form action={setRole}>
                        <input type="hidden" name="personId" value={p.id} />
                        <input type="hidden" name="role" value={p.role === "admin" ? "learner" : "admin"} />
                        {p.role === "admin" ? <><Pill kind="req">Admin</Pill>{p.id !== me.personId && <button className="link small" style={{ marginLeft: 6 }}>Remove</button>}</> : <button className="link small">Make admin</button>}
                      </form>
                    </td>
                    {ordered.map((l) => { const x = L[l.id]; return (
                      <td key={l.id}>{x?.attempts ? <span className={`cell ${x.passed ? "pass" : "fail"}`}>{x.best}%</span> : <span className="cell none">{x?.watched ? "watched" : "—"}</span>}</td>
                    ); })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="section-title"><h2>Recent practice calls</h2></div>
        <div className="card">
          {recent.length === 0 && <p className="muted">No practice calls yet.</p>}
          {recent.map((c) => (
            <div key={c.id} className="rowline">
              <span className="n">#{c.num}</span>
              <div className="t"><Link className="link" href={`/admin/calls/${c.id}`}>{c.name || c.email} · {c.title}</Link><div className="small muted">{c.mode === "voice" ? "Voice" : "Chat"} · {c.level === "experienced" ? "Experienced" : "Beginner"} · {fmtDate(c.at)}</div></div>
              <Pill kind={c.score >= 7 ? "pass" : "fail"}>{c.score}/10</Pill>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
