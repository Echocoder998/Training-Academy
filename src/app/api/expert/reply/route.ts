import { z } from "zod";
import { currentUser } from "@/lib/session";
import { aiConfigured, streamText } from "@/lib/ai";
import { abbKnowledge, expertPrompt } from "@/lib/expert";

const Body = z.object({
  turns: z.array(z.object({ role: z.enum(["user", "expert"]), text: z.string().max(4000) })).min(1).max(60),
});

/** Streams the ABB Expert's answer to the rep's latest question. */
export async function POST(req: Request) {
  if (!(await currentUser())) return new Response("Not signed in", { status: 401 });
  if (!aiConfigured()) return new Response("AI is not configured", { status: 503 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const stream = await streamText(expertPrompt(await abbKnowledge(), parsed.data.turns), { smart: true, maxTokens: 1500 });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
