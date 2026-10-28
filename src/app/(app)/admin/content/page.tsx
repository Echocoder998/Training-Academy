import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, t } from "@/db";
import { requireAdmin } from "@/lib/session";
import { loadCatalog, lessonsOf } from "@/lib/data";
import { Band } from "@/components/ui";

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string }> }) {
  await requireAdmin();
  const { tab = "courses", saved } = await searchParams;
  const { courses, lessons, paths } = await loadCatalog();
  const [scenarios, specs] = await Promise.all([
    db().select().from(t.scenarios).orderBy(asc(t.scenarios.num)),
    db().select().from(t.specs).orderBy(asc(t.specs.order)),
  ]);
  const tabs: [string, string][] = [["courses", "Courses & lessons"], ["practice", "Role-play & specs"], ["paths", "Learning paths"]];

  return (
    <>
      <Band eyebrow="Admin" title="Manage content" />
      <main>
        <div className="chips">{tabs.map(([k, l]) => <Link key={k} className="chip" href={`/admin/content?tab=${k}`} aria-current={tab === k ? "true" : undefined}>{l}</Link>)}</div>
        {saved && <div className="notice ok">Saved.</div>}

        {tab === "courses" && <>
          <div className="row"><Link className="btn" href="/admin/content/courses/new">New course</Link><Link className="btn primary" href="/admin/content/lessons/new">New lesson</Link></div>
          {courses.map((c) => (
            <div key={c.id} className="card stack">
              <div className="row spread">
                <div><div className="eyebrow">{c.category} · order {c.order ?? "—"}</div><h3>{c.title}</h3></div>
                <div className="row"><Link className="btn sm" href={`/admin/content/courses/${c.id}`}>Edit course</Link><Link className="btn sm" href={`/admin/content/lessons/new?course=${c.id}`}>Add lesson</Link></div>
              </div>
              <div>
                {lessonsOf(lessons, c.id).map((l) => (
                  <div key={l.id} className="rowline"><span className="n">{l.order ?? ""}</span>
                    <div className="t">{l.title}<div className="small muted">{l.quiz.length} questions · {l.videoUrl ? "uploaded video" : l.videoLink ? "video link" : <span style={{ color: "var(--warn)" }}>no video</span>}</div></div>
                    <Link className="btn sm" href={`/admin/content/lessons/${l.id}`}>Edit</Link></div>
                ))}
                {lessonsOf(lessons, c.id).length === 0 && <p className="muted">No lessons yet.</p>}
              </div>
            </div>
          ))}
        </>}

        {tab === "practice" && <>
          <div className="card stack">
            <div className="row spread"><h3>Role-play scenarios</h3><Link className="btn sm" href="/admin/content/scenarios/new">New scenario</Link></div>
            <p className="small muted" style={{ margin: 0 }}>Chat role-play uses these directly. For voice, scenario numbers must also exist in your ElevenLabs agent&apos;s prompt.</p>
            <div>{scenarios.map((s) => <div key={s.id} className="rowline"><span className="n">#{s.num}</span><div className="t">{s.title}<div className="small muted">{s.industry}</div></div><Link className="btn sm" href={`/admin/content/scenarios/${s.id}`}>Edit</Link></div>)}</div>
          </div>
          <div className="card stack">
            <div className="row spread"><h3>Spec challenges</h3><Link className="btn sm" href="/admin/content/specs/new">New challenge</Link></div>
            <div>{specs.map((s) => <div key={s.id} className="rowline"><span className="n">{s.order ?? ""}</span><div className="t">{s.title}<div className="small muted">{s.industry}</div></div><Link className="btn sm" href={`/admin/content/specs/${s.id}`}>Edit</Link></div>)}</div>
          </div>
        </>}

        {tab === "paths" && (
          <div className="card stack">
            <div className="row spread"><h3>Learning paths by role</h3><Link className="btn sm" href="/admin/content/paths/new">New path</Link></div>
            <p className="small muted" style={{ margin: 0 }}>Each person picks their role on the Courses page. Their due date counts from the day they pick it.</p>
            <div>{paths.map((p) => <div key={p.id} className="rowline"><div className="t">{p.name}<div className="small muted">{p.courseIds.length} courses{p.dueDays ? ` · due in ${p.dueDays} days` : ""}</div></div><Link className="btn sm" href={`/admin/content/paths/${p.id}`}>Edit</Link></div>)}</div>
          </div>
        )}
      </main>
    </>
  );
}
