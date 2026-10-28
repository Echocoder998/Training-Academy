import Link from "next/link";
import { sql, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/session";
import { loadCatalog, loadMyResults, coursePct, courseDone, pathInfo, fmtDate, lessonsOf } from "@/lib/data";
import { Band, Gauge, Pill } from "@/components/ui";
import { PathPicker } from "@/components/PathPicker";

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string; role?: string }> }) {
  const me = await requireUser();
  const { cat = "All", role } = await searchParams;
  const [{ courses, lessons, paths }, { person, lessonMap }] = await Promise.all([loadCatalog(), loadMyResults(me.personId)]);
  const [{ calls }] = await db().select({ calls: sql<number>`count(*)::int` }).from(t.roleplayAttempts).where(eq(t.roleplayAttempts.personId, me.personId));

  const path = paths.find((p) => p.id === person?.pathId);
  const info = path && person ? pathInfo(path, person, courses, lessons, lessonMap) : null;
  const required = new Set(path?.courseIds ?? []);
  const cats = ["All", ...new Set(courses.map((c) => c.category))];
  const visible = courses.filter((c) => cat === "All" || c.category === cat);
  const reqList = visible.filter((c) => required.has(c.id));
  const other = visible.filter((c) => !required.has(c.id));
  const passed = lessons.filter((l) => lessonMap[l.id]?.passed).length;

  const card = (c: (typeof courses)[number], req: boolean) => {
    const n = lessonsOf(lessons, c.id).length;
    return (
      <Link key={c.id} href={`/courses/${c.id}`} className="card course">
        <div className="top">
          <div><div className="eyebrow">{c.category}</div><h3>{c.title}</h3></div>
          <Gauge pct={coursePct(lessons, c.id, lessonMap)} />
        </div>
        <p>{c.summary}</p>
        <div className="row"><span className="small muted">{n} lesson{n === 1 ? "" : "s"}</span>{req && <Pill kind="req">Required</Pill>}</div>
      </Link>
    );
  };

  return (
    <>
      <Band eyebrow="MCE Sales Academy" title={`Welcome, ${me.name.split(" ")[0] || "back"}`}
        right={<div className="stat" style={{ color: "#fff" }}>
          <div><b>{passed}<span style={{ fontSize: 18, color: "#ccc" }}> / {lessons.length}</span></b><span style={{ color: "#ddd" }}>Lessons passed</span></div>
          <div><b>{courses.filter((c) => courseDone(lessons, c.id, lessonMap)).length}</b><span style={{ color: "#ddd" }}>Courses complete</span></div>
          <div><b>{calls}</b><span style={{ color: "#ddd" }}>Calls practiced</span></div>
        </div>}>
        Product knowledge, discovery skills and customer-call practice for the instrumentation and process control lines we sell.
      </Band>
      <main>
        {paths.length > 0 && (!path || role === "change" ? (
          <div className="card accent stack">
            <h2>What&apos;s your role?</h2>
            <p className="muted" style={{ margin: 0 }}>Pick one to see the training required for your job and your due date.</p>
            <PathPicker paths={paths.map((p) => ({ id: p.id, name: p.name }))} current={person?.pathId ?? null} />
          </div>
        ) : info && (
          <div className="card accent row spread">
            <div className="stack" style={{ gap: 4, flex: 1, minWidth: 220 }}>
              <div className="eyebrow">Your learning path</div>
              <h2>{path.name}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {info.done} of {info.total} required courses complete{info.due ? ` · due ${fmtDate(info.due)}` : ""}{" "}
                {info.overdue ? <Pill kind="fail">Overdue</Pill> : info.total > 0 && info.done === info.total ? <Pill kind="pass">Path complete</Pill> : null}
              </p>
              <div><Link className="link" href="/?role=change">Change role</Link></div>
            </div>
            <Gauge pct={info.total ? Math.round((100 * info.done) / info.total) : 0} size={110} />
          </div>
        ))}

        <div className="chips" role="group" aria-label="Filter by category">
          {cats.map((c) => <Link key={c} className="chip" href={c === "All" ? "/" : `/?cat=${encodeURIComponent(c)}`} aria-current={cat === c ? "true" : undefined}>{c}</Link>)}
        </div>

        {courses.length === 0 && <div className="card empty">No courses yet. {me.role === "admin" ? "Run the seed script or add courses in Manage." : "Check back soon."}</div>}
        {reqList.length > 0 && <><div className="section-title"><h2>Required for {path!.name}</h2></div><div className="grid">{reqList.map((c) => card(c, true))}</div></>}
        {other.length > 0 && <>{reqList.length > 0 && <div className="section-title"><h2>More courses</h2></div>}<div className="grid">{other.map((c) => card(c, false))}</div></>}
      </main>
    </>
  );
}
