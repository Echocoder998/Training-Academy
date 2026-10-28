import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireAdmin } from "@/lib/session";
import { Band } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { saveSpec } from "@/app/admin-actions";

export default async function EditSpec({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [s] = isNew ? [] : await db().select().from(t.specs).where(eq(t.specs.id, id));
  return (
    <>
      <Band eyebrow="Manage" title={isNew ? "New spec challenge" : "Edit spec challenge"} />
      <main>
        <div><Link className="link" href="/admin/content?tab=practice">← Manage</Link></div>
        <form className="card stack" action={saveSpec}>
          <input type="hidden" name="id" value={isNew ? "" : id} />
          <div className="form">
            <label className="f wide">Title<input name="title" required defaultValue={s?.title} /></label>
            <label className="f">Industry<input name="industry" defaultValue={s?.industry} /></label>
            <label className="f">Order<input name="order" type="number" defaultValue={s?.order ?? ""} /></label>
            <label className="f wide">The customer&apos;s application<textarea name="application" rows={5} required defaultValue={s?.application} /></label>
          </div>
          <div className="qe">
            <b>Options (select the correct one)</b>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="optline">
                <input type="radio" name="answer" value={i} defaultChecked={s?.answer === i} required aria-label={`Option ${i + 1} is correct`} />
                <input name={`opt${i}`} placeholder={`Option ${i + 1}`} defaultValue={s?.options[i] ?? ""} />
              </div>
            ))}
            <input name="why" placeholder="Why this is the right pick" defaultValue={s?.why} />
          </div>
          <div className="row"><button className="btn primary">Save challenge</button><Link className="btn" href="/admin/content?tab=practice">Cancel</Link></div>
        </form>
        {!isNew && <DeleteButton kind="specs" id={id} />}
      </main>
    </>
  );
}
