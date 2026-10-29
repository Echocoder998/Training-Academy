import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireUser } from "@/lib/session";
import { Band } from "@/components/ui";
import { RolePlay } from "@/components/RolePlay";

export default async function RolePlayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  await requireUser();
  const { id } = await params;
  const { mode } = await searchParams;
  const [s] = await db().select().from(t.scenarios).where(eq(t.scenarios.id, id));
  if (!s) notFound();
  return (
    <>
      <Band eyebrow={`${s.topic ? s.topic + " · " : ""}${s.level === "beginner" ? "Beginner" : "Experienced"} · ${s.industry}`} title={s.title}>
        You&apos;re on the phone with {s.persona}. Ask discovery questions, then recommend a product.
      </Band>
      <main>
        <div><Link className="link" href={s.topic === "ABB" ? "/practice?level=abb" : s.level === "beginner" ? "/practice" : "/practice?level=experienced"}>← All scenarios</Link></div>
        {/* Only what the trainee should see goes to the browser. Hidden details stay on the server. */}
        <RolePlay scenario={{ id: s.id, num: s.num, opening: s.opening }} initialMode={mode === "chat" ? "chat" : "voice"} level={s.level} />
      </main>
    </>
  );
}
