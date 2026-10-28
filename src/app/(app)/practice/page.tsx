import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/session";
import { Band, Pill } from "@/components/ui";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const level = (await searchParams).level === "experienced" ? "experienced" : "beginner";
  const me = await requireUser();
  const d = db();
  const [scenarios, specs, best, specRes] = await Promise.all([
    d.select({ id: t.scenarios.id, num: t.scenarios.num, title: t.scenarios.title, industry: t.scenarios.industry, persona: t.scenarios.persona }).from(t.scenarios).where(eq(t.scenarios.level, level)).orderBy(asc(t.scenarios.num)),
    d.select({ id: t.specs.id, title: t.specs.title, industry: t.specs.industry }).from(t.specs).orderBy(asc(t.specs.order)),
    d.select({ id: t.roleplayAttempts.scenarioId, best: sql<number>`max(${t.roleplayAttempts.score})::int`, n: sql<number>`count(*)::int` })
      .from(t.roleplayAttempts).where(eq(t.roleplayAttempts.personId, me.personId)).groupBy(t.roleplayAttempts.scenarioId),
    d.select().from(t.specResults).where(eq(t.specResults.personId, me.personId)),
  ]);
  const bestMap = Object.fromEntries(best.map((b) => [b.id, b]));
  const specMap = Object.fromEntries(specRes.map((r) => [r.specId, r]));
  const solved = specs.filter((s) => specMap[s.id]?.correct).length;

  return (
    <>
      <Band eyebrow="Practice" title="Customer call role-play">
        Run a real discovery call with an AI customer by voice or chat, then get graded on what you uncovered and what you recommended.
      </Band>
      <main>
        <div className="card row spread">
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 240 }}>
            <b>Difficulty</b>
            <span className="small muted">{level === "beginner"
              ? "Beginner: short, everyday calls with a friendly customer. Ask a few basic questions, then recommend. Best for new reps."
              : "Experienced: tougher applications and a busy, realistic customer who only shares details when asked and pushes back."}</span>
          </div>
          <div className="chips">
            <Link className="chip" href="/practice" aria-current={level === "beginner" ? "true" : undefined}>Beginner</Link>
            <Link className="chip" href="/practice?level=experienced" aria-current={level === "experienced" ? "true" : undefined}>Experienced</Link>
          </div>
        </div>
        <div className="grid">
          {scenarios.map((s, i) => {
            const b = bestMap[s.id];
            return (
              <div key={s.id} className="card course stack">
                <div className="row spread">
                  <span style={{ fontSize: 30, fontWeight: 800, color: "var(--red)", lineHeight: 1 }}>#{i + 1}</span>
                  {b ? <Pill kind={b.best >= 7 ? "pass" : "fail"}>Best {b.best}/10</Pill> : <Pill kind="new">Not tried</Pill>}
                </div>
                <div><div className="eyebrow">{s.industry}</div><h3>{s.title}</h3></div>
                <p>{s.persona}</p>
                <div className="row">
                  <Link className="btn primary sm" href={`/practice/roleplay/${s.id}?mode=voice`}>Practice by voice</Link>
                  <Link className="btn sm" href={`/practice/roleplay/${s.id}?mode=chat`}>Practice in chat</Link>
                </div>
              </div>
            );
          })}
          {scenarios.length === 0 && <div className="card empty">No scenarios yet.</div>}
        </div>

        <div className="section-title"><h2>Spec challenges</h2><span className="small muted">{solved} / {specs.length} solved</span></div>
        <p className="muted" style={{ margin: 0 }}>A customer describes their application. Pick the product you&apos;d quote.</p>
        <div className="grid">
          {specs.map((s) => {
            const r = specMap[s.id];
            return (
              <Link key={s.id} href={`/practice/specs/${s.id}`} className="card course">
                <div className="row spread"><span className="eyebrow">{s.industry}</span>{r ? <Pill kind={r.correct ? "pass" : "fail"}>{r.correct ? "Solved" : "Try again"}</Pill> : <Pill kind="new">New</Pill>}</div>
                <h3>{s.title}</h3>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
