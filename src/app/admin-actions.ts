"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, t } from "@/db";
import type { QuizQuestion } from "@/db/schema";
import { currentUser } from "@/lib/session";

async function admin() {
  const u = await currentUser();
  if (u?.role !== "admin") throw new Error("Admins only");
  return u;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => { const v = s(fd, k); return v === "" ? null : Number(v); };
const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const done = (tab: string) => { revalidatePath("/", "layout"); redirect(`/admin/content?tab=${tab}&saved=1`); };

export async function saveCourse(fd: FormData) {
  await admin();
  const id = s(fd, "id") || newId("c");
  const v = { title: s(fd, "title"), category: s(fd, "category") || "General", summary: s(fd, "summary"), order: n(fd, "order") };
  if (!v.title) throw new Error("Title is required");
  await db().insert(t.courses).values({ id, ...v }).onConflictDoUpdate({ target: t.courses.id, set: v });
  done("courses");
}

export async function deleteRow(fd: FormData) {
  await admin();
  const kind = s(fd, "kind"), id = s(fd, "id");
  const table = { courses: t.courses, lessons: t.lessons, scenarios: t.scenarios, specs: t.specs, paths: t.paths }[kind];
  if (!table) throw new Error("Unknown type");
  await db().delete(table).where(eq(table.id, id));
  done(kind === "courses" || kind === "lessons" ? "courses" : kind === "paths" ? "paths" : "practice");
}

export async function saveLesson(input: {
  id?: string; courseId: string; title: string; order: number | null; minutes: number | null; passScore: number;
  keyPoints: string; videoUrl: string | null; videoLink: string | null; quiz: QuizQuestion[];
}) {
  await admin();
  if (!input.title) return { error: "Give the lesson a title." };
  for (const [i, q] of input.quiz.entries()) {
    if (!q.q || q.options.length < 2) return { error: `Question ${i + 1} needs the question text and at least two options.` };
    if (q.answer < 0 || q.answer >= q.options.length) return { error: `Question ${i + 1}: pick the correct option.` };
  }
  if (input.videoLink && !/^https:\/\//.test(input.videoLink)) return { error: "The video link must start with https://" };
  const id = input.id || newId("l");
  const { id: _ignored, ...rest } = input;
  void _ignored;
  const v = { ...rest, passScore: Math.min(100, Math.max(1, input.passScore || 80)) };
  await db().insert(t.lessons).values({ id, ...v }).onConflictDoUpdate({ target: t.lessons.id, set: v });
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function saveScenario(fd: FormData) {
  await admin();
  const id = s(fd, "id") || newId("sc");
  const v = { num: n(fd, "num") ?? 0, industry: s(fd, "industry"), title: s(fd, "title"), persona: s(fd, "persona"), opening: s(fd, "opening"), hidden: s(fd, "hidden"), goodRec: s(fd, "goodRec"), level: (s(fd, "level") === "beginner" ? "beginner" : "experienced") as "beginner" | "experienced" };
  if (!v.title || !v.opening) throw new Error("Title and opening line are required");
  await db().insert(t.scenarios).values({ id, ...v }).onConflictDoUpdate({ target: t.scenarios.id, set: v });
  done("practice");
}

export async function saveSpec(fd: FormData) {
  await admin();
  const id = s(fd, "id") || newId("sp");
  const raw = [0, 1, 2, 3].map((i) => s(fd, `opt${i}`));
  const pick = n(fd, "answer");
  const keep = raw.map((o, i) => [o, i] as const).filter(([o]) => o);
  const answer = keep.findIndex(([, i]) => i === pick);
  if (keep.length < 2 || answer < 0) throw new Error("Add at least two options and pick the right one");
  const v = { title: s(fd, "title"), industry: s(fd, "industry"), order: n(fd, "order"), application: s(fd, "application"), options: keep.map(([o]) => o), answer, why: s(fd, "why") };
  await db().insert(t.specs).values({ id, ...v }).onConflictDoUpdate({ target: t.specs.id, set: v });
  done("practice");
}

export async function savePath(fd: FormData) {
  await admin();
  const id = s(fd, "id") || newId("p");
  const v = { name: s(fd, "name"), order: n(fd, "order"), dueDays: n(fd, "dueDays"), courseIds: fd.getAll("courseIds").map(String) };
  if (!v.name) throw new Error("Role name is required");
  await db().insert(t.paths).values({ id, ...v }).onConflictDoUpdate({ target: t.paths.id, set: v });
  done("paths");
}

export async function setRole(fd: FormData) {
  const me = await admin();
  const personId = s(fd, "personId"), role = s(fd, "role") === "admin" ? "admin" : "learner";
  if (personId === me.personId && role !== "admin") throw new Error("You can't remove your own admin access");
  await db().update(t.people).set({ role }).where(eq(t.people.id, personId));
  revalidatePath("/admin");
}
