"use server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, t } from "@/db";
import { currentUser } from "@/lib/session";

async function me() {
  const u = await currentUser();
  if (!u) throw new Error("Not signed in");
  return u;
}

export async function setPath(pathId: string) {
  const u = await me();
  const [p] = await db().select({ pathId: t.people.pathId }).from(t.people).where(eq(t.people.id, u.personId));
  if (p?.pathId !== pathId) {
    await db().update(t.people).set({ pathId, pathStart: new Date() }).where(eq(t.people.id, u.personId));
  }
  revalidatePath("/");
}

export async function markWatched(lessonId: string) {
  const u = await me();
  await db().insert(t.lessonResults).values({ personId: u.personId, lessonId, watched: true })
    .onConflictDoUpdate({ target: [t.lessonResults.personId, t.lessonResults.lessonId], set: { watched: true, updatedAt: new Date() } });
  revalidatePath(`/lessons/${lessonId}`);
}

/** Scores on the server so answers can't be faked from the browser. */
export async function submitQuiz(lessonId: string, answers: number[]) {
  const u = await me();
  const [lesson] = await db().select().from(t.lessons).where(eq(t.lessons.id, lessonId));
  if (!lesson) throw new Error("Lesson not found");
  const qs = lesson.quiz;
  const right = qs.filter((q, i) => answers[i] === q.answer).length;
  const score = qs.length ? Math.round((100 * right) / qs.length) : 0;
  const passed = score >= lesson.passScore;
  await db().insert(t.lessonResults)
    .values({ personId: u.personId, lessonId, best: score, last: score, attempts: 1, passed })
    .onConflictDoUpdate({
      target: [t.lessonResults.personId, t.lessonResults.lessonId],
      set: {
        best: sql`greatest(${t.lessonResults.best}, ${score})`,
        last: score,
        attempts: sql`${t.lessonResults.attempts} + 1`,
        passed: sql`${t.lessonResults.passed} or ${passed}`,
        updatedAt: new Date(),
      },
    });
  await db().update(t.people).set({ lastActive: new Date() }).where(eq(t.people.id, u.personId));
  revalidatePath(`/lessons/${lessonId}`);
  return { score, passed, answers: qs.map((q) => q.answer), why: qs.map((q) => q.why || "") };
}

export async function submitSpec(specId: string, pick: number) {
  const u = await me();
  const [s] = await db().select().from(t.specs).where(eq(t.specs.id, specId));
  if (!s) throw new Error("Challenge not found");
  const correct = pick === s.answer;
  await db().insert(t.specResults).values({ personId: u.personId, specId, correct, attempts: 1 })
    .onConflictDoUpdate({
      target: [t.specResults.personId, t.specResults.specId],
      set: { correct: sql`${t.specResults.correct} or ${correct}`, attempts: sql`${t.specResults.attempts} + 1`, updatedAt: new Date() },
    });
  revalidatePath("/practice");
  return { correct, answer: s.answer, why: s.why };
}

export async function myRoleplayBest(scenarioId: string) {
  const u = await me();
  const [r] = await db().select({ best: sql<number>`max(${t.roleplayAttempts.score})` }).from(t.roleplayAttempts)
    .where(and(eq(t.roleplayAttempts.personId, u.personId), eq(t.roleplayAttempts.scenarioId, scenarioId)));
  return r?.best ?? null;
}

export async function setMyName(fd: FormData) {
  const u = await me();
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  await db().update(t.people).set({ name }).where(eq(t.people.id, u.personId));
  revalidatePath("/", "layout");
}
