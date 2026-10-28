import { z } from "zod";
import { currentUser } from "@/lib/session";
import { aiConfigured, generateJson, QUIZ_SCHEMA } from "@/lib/ai";
import { quizPrompt } from "@/lib/prompts";
import type { QuizQuestion } from "@/db/schema";

const Body = z.object({ courseTitle: z.string().max(200), lessonTitle: z.string().max(200), keyPoints: z.string().max(8000) });

export async function POST(req: Request) {
  const me = await currentUser();
  if (me?.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
  if (!aiConfigured()) return Response.json({ error: "AI is not configured" }, { status: 503 });
  const p = Body.safeParse(await req.json());
  if (!p.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const out = await generateJson<{ questions?: QuizQuestion[] }>(quizPrompt(p.data.courseTitle, p.data.lessonTitle, p.data.keyPoints), QUIZ_SCHEMA);
  const questions = (out.questions || [])
    .filter((q) => q && q.q && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
    .map((q) => ({ q: String(q.q), options: q.options.slice(0, 4).map(String), answer: q.answer, why: String(q.why || "") }));
  return Response.json({ questions });
}
