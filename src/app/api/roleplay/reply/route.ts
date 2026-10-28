import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db";
import { currentUser } from "@/lib/session";
import { aiConfigured, streamText } from "@/lib/ai";
import { customerPrompt } from "@/lib/prompts";

const Body = z.object({
  scenarioId: z.string(),
  turns: z.array(z.object({ role: z.enum(["customer", "rep"]), text: z.string().max(2000) })).max(60),
  level: z.enum(["beginner", "experienced"]).default("beginner"),
});

export async function POST(req: Request) {
  if (!(await currentUser())) return new Response("Not signed in", { status: 401 });
  if (!aiConfigured()) return new Response("AI is not configured", { status: 503 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const [s] = await db().select().from(t.scenarios).where(eq(t.scenarios.id, parsed.data.scenarioId));
  if (!s) return new Response("Scenario not found", { status: 404 });
  const stream = await streamText(customerPrompt(s, parsed.data.turns, parsed.data.level));
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
