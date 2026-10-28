import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireAdmin } from "@/lib/session";
import { loadCatalog } from "@/lib/data";
import { Band } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { savePath } from "@/app/admin-actions";

export default async function EditPath({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [p] = isNew ? [] : await db().select().from(t.paths).where(eq(t.paths.id, id));
  const { courses } = await loadCatalog();
  return (
    <>
      <Band eyebrow="Manage" title={isNew ? "New learning path" : "Edit learning path"} />
      <main>
        <div><Link className="link" href="/admin/content?tab=paths">← Manage</Link></div>
        <form className="card stack" action={savePath}>
          <input type="hidden" name="id" value={isNew ? "" : id} />
          <div className="form">
            <label className="f">Role name<input name="name" required defaultValue={p?.name} placeholder="Inside Sales" /></label>
            <label className="f">Days to complete<input name="dueDays" type="number" min={0} defaultValue={p?.dueDays ?? 30} /></label>
            <label className="f">Order<input name="order" type="number" defaultValue={p?.order ?? ""} /></label>
          </div>
          <b>Required courses</b>
          <div className="checks">
            {courses.map((c) => <label key={c.id}><input type="checkbox" name="courseIds" value={c.id} defaultChecked={p?.courseIds.includes(c.id)} /> {c.title}</label>)}
          </div>
          <div className="row"><button className="btn primary">Save path</button><Link className="btn" href="/admin/content?tab=paths">Cancel</Link></div>
        </form>
        {!isNew && <DeleteButton kind="paths" id={id} />}
      </main>
    </>
  );
}
