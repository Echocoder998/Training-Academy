import Link from "next/link";
import { eq, max } from "drizzle-orm";
import { db, t } from "@/db";
import { requireAdmin } from "@/lib/session";
import { Band } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { saveScenario } from "@/app/admin-actions";

export default async function EditScenario({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [s] = isNew ? [] : await db().select().from(t.scenarios).where(eq(t.scenarios.id, id));
  const [{ top }] = await db().select({ top: max(t.scenarios.num) }).from(t.scenarios);
  return (
    <>
      <Band eyebrow="Manage" title={isNew ? "New scenario" : "Edit scenario"} />
      <main>
        <div><Link className="link" href="/admin/content?tab=practice">← Manage</Link></div>
        <form className="card stack" action={saveScenario}>
          <input type="hidden" name="id" value={isNew ? "" : id} />
          <div className="form">
            <label className="f">Number<input name="num" type="number" min={1} required defaultValue={s?.num ?? (top ?? 0) + 1} /></label>
            <label className="f">Industry<input name="industry" defaultValue={s?.industry} placeholder="e.g. Water treatment" /></label>
            <label className="f wide">Title<input name="title" required defaultValue={s?.title} /></label>
            <label className="f wide">Who the customer is<input name="persona" defaultValue={s?.persona} placeholder="Mike, maintenance tech at a city water plant" /></label>
            <label className="f wide">Customer&apos;s opening line<textarea name="opening" rows={2} required defaultValue={s?.opening} /></label>
            <label className="f wide">Hidden details (revealed only when the rep asks)<textarea name="hidden" rows={5} defaultValue={s?.hidden} /></label>
            <label className="f wide">Ideal recommendation (used for grading)<textarea name="goodRec" rows={3} defaultValue={s?.goodRec} /></label>
          </div>
          <div className="notice">If you add or change a scenario, update your ElevenLabs agent&apos;s prompt with the same number and details so voice practice matches.</div>
          <div className="row"><button className="btn primary">Save scenario</button><Link className="btn" href="/admin/content?tab=practice">Cancel</Link></div>
        </form>
        {!isNew && <DeleteButton kind="scenarios" id={id} />}
      </main>
    </>
  );
}
