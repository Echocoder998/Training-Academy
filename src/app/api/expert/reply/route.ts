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
  let step = "loading ABB notes";
  try {
    const notes = await abbKnowledge();
    step = "asking Claude";
    const stream = await streamText(expertPrompt(notes, parsed.data.turns), { smart: true, maxTokens: 1500 });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`ABB Expert failed while ${step}:`, e);
    return new Response(`The ABB Expert couldn't answer (${step}): ${msg.slice(0, 300)}`, { status: 502 });
  }
}
