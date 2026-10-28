import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireAdmin } from "@/lib/session";
import { Band } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { saveCourse } from "@/app/admin-actions";

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [c] = isNew ? [] : await db().select().from(t.courses).where(eq(t.courses.id, id));
  const [{ n }] = isNew ? [{ n: 0 }] : await db().$count(t.lessons, eq(t.lessons.courseId, id)).then((n) => [{ n }]);
  return (
    <>
      <Band eyebrow="Manage" title={isNew ? "New course" : "Edit course"} />
      <main>
        <div><Link className="link" href="/admin/content">← Manage</Link></div>
        <form className="card stack" action={saveCourse}>
          <input type="hidden" name="id" value={isNew ? "" : id} />
          <div className="form">
            <label className="f wide">Title<input name="title" required defaultValue={c?.title} /></label>
            <label className="f">Category<input name="category" defaultValue={c?.category} placeholder="e.g. Pressure" /></label>
            <label className="f">Order<input name="order" type="number" defaultValue={c?.order ?? ""} /></label>
            <label className="f wide">Summary<textarea name="summary" rows={3} defaultValue={c?.summary} /></label>
          </div>
          <div className="row"><button className="btn primary">Save course</button><Link className="btn" href="/admin/content">Cancel</Link></div>
        </form>
        {!isNew && (n > 0 ? <p className="small muted">Delete this course&apos;s {n} lesson{n === 1 ? "" : "s"} before deleting the course.</p> : <DeleteButton kind="courses" id={id} label="Delete course" />)}
      </main>
    </>
  );
}
