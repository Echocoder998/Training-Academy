import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/session";
import { Band } from "@/components/ui";
import { SpecChallenge } from "@/components/SpecChallenge";

export default async function SpecPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const all = await db().select({ id: t.specs.id }).from(t.specs).orderBy(asc(t.specs.order));
  const [s] = await db().select().from(t.specs).where(eq(t.specs.id, id));
  if (!s) notFound();
  const i = all.findIndex((x) => x.id === id);
  const next = all[(i + 1) % all.length]?.id;
  return (
    <>
      <Band eyebrow={`Spec challenge · ${s.industry}`} title={s.title} />
      <main>
        <div><Link className="link" href="/practice">← Practice</Link></div>
        <SpecChallenge id={s.id} application={s.application} options={s.options} nextId={next !== id ? next : undefined} />
      </main>
    </>
  );
}
