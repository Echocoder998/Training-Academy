import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db";
import type { Grade } from "@/db/schema";
import { currentUser } from "@/lib/session";
import { aiConfigured, generateJson, GRADE_SCHEMA } from "@/lib/ai";
import { gradePrompt } from "@/lib/prompts";

const Body = z.object({
  scenarioId: z.string(),
  mode: z.enum(["chat", "voice"]),
  turns: z.array(z.object({ role: z.enum(["customer", "rep"]), text: z.string().max(4000) })).min(2).max(200),
  level: z.enum(["beginner", "experienced"]).default("beginner"),
});

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!aiConfigured()) return Response.json({ error: "AI is not configured" }, { status: 503 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { scenarioId, mode, turns } = parsed.data;
  const [s] = await db().select().from(t.scenarios).where(eq(t.scenarios.id, scenarioId));
  if (!s) return Response.json({ error: "Scenario not found" }, { status: 404 });

  const raw = await generateJson<Partial<Grade>>(gradePrompt(s, turns, s.level), GRADE_SCHEMA);
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);
  const grade: Grade = {
    score: Math.max(0, Math.min(10, Math.round(Number(raw.score) || 0))),
    uncovered: arr(raw.uncovered),
    missed: arr(raw.missed),
    recommendation: String(raw.recommendation || ""),
    tips: arr(raw.tips),
  };
  await db().insert(t.roleplayAttempts).values({ personId: me.personId, scenarioId, mode, level: s.level, score: grade.score, transcript: turns, grade });
  await db().update(t.people).set({ lastActive: new Date() }).where(eq(t.people.id, me.personId));
  return Response.json({ grade, goodRec: s.goodRec });
}
