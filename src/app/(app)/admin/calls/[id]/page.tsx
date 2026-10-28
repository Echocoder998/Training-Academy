import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireAdmin } from "@/lib/session";
import { fmtDate } from "@/lib/data";
import { Band } from "@/components/ui";

/** Lets a manager read a practice call's transcript and the AI's grading. */
export default async function CallReview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [c] = await db().select({ a: t.roleplayAttempts, name: t.people.name, email: t.people.email, title: t.scenarios.title, num: t.scenarios.num })
    .from(t.roleplayAttempts).innerJoin(t.people, eq(t.people.id, t.roleplayAttempts.personId)).innerJoin(t.scenarios, eq(t.scenarios.id, t.roleplayAttempts.scenarioId))
    .where(eq(t.roleplayAttempts.id, Number(id)));
  if (!c) notFound();
  const g = c.a.grade;
  return (
    <>
      <Band eyebrow={`Scenario #${c.num} · ${c.a.mode === "voice" ? "Voice" : "Chat"} · ${c.a.level === "experienced" ? "Experienced" : "Beginner"} · ${fmtDate(c.a.createdAt)}`} title={`${c.name || c.email}: ${c.title}`}
        right={<span className="score" style={{ color: "#fff" }}>{c.a.score}/10</span>} />
      <main>
        <div><Link className="link" href="/admin">← Team results</Link></div>
        <div className="card stack">
          <h3>Transcript</h3>
          <div className="chat" style={{ maxHeight: "none" }}>
            {c.a.transcript.map((m, i) => <div key={i} className={`msg ${m.role === "customer" ? "cust" : "rep"}`}><span className="who">{m.role === "customer" ? "Customer" : "Rep"}</span>{m.text}</div>)}
          </div>
        </div>
        <div className="card accent stack">
          <h3>AI grading</h3>
          {g.uncovered.length > 0 && <div><b>Uncovered</b><ul className="keypoints">{g.uncovered.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {g.missed.length > 0 && <div><b>Missed</b><ul className="keypoints">{g.missed.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {g.recommendation && <p style={{ margin: 0 }}><b>Recommendation:</b> {g.recommendation}</p>}
          {g.tips.length > 0 && <div><b>Coaching tips</b><ul className="keypoints">{g.tips.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </div>
      </main>
    </>
  );
}
