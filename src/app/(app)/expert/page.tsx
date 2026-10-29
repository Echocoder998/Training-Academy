import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Band } from "@/components/ui";
import { Expert } from "@/components/Expert";

export default async function ExpertPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  await requireUser();
  const { mode } = await searchParams;
  return (
    <>
      <Band eyebrow="Your ABB product expert" title="Flow Mind AI">
        Ask anything about ABB flow, pressure, temperature, level and positioners: which product fits, how it works, how to sell it, or how to answer an objection. Chat or talk by voice.
      </Band>
      <main>
        <Expert initialMode={mode === "voice" ? "voice" : "chat"} />
        <p className="small muted" style={{ margin: 0 }}>
          Flow Mind AI is trained on the academy&apos;s ABB courses. Always confirm specs, pricing and lead times with the ABB datasheet or your ABB rep before quoting.
          Want to practice a customer call instead? Try the <Link className="link" href="/practice?level=abb">ABB role-plays</Link>.
        </p>
      </main>
    </>
  );
}
