import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db";
import type { Course, Lesson, LessonResult, Path, Person } from "@/db/schema";

export const DAY = 86_400_000;

export async function loadCatalog() {
  const d = db();
  const [courses, lessons, paths] = await Promise.all([
    d.select().from(t.courses).orderBy(asc(t.courses.order), asc(t.courses.title)),
    d.select().from(t.lessons).orderBy(asc(t.lessons.order), asc(t.lessons.title)),
    d.select().from(t.paths).orderBy(asc(t.paths.order)),
  ]);
  return { courses, lessons, paths };
}

export async function loadMyResults(personId: string) {
  const d = db();
  const [person] = await d.select().from(t.people).where(eq(t.people.id, personId));
  const lessonRows = await d.select().from(t.lessonResults).where(eq(t.lessonResults.personId, personId));
  const lessonMap: Record<string, LessonResult> = Object.fromEntries(lessonRows.map((r) => [r.lessonId, r]));
  return { person, lessonMap };
}

export const lessonsOf = (lessons: Lesson[], courseId: string) => lessons.filter((l) => l.courseId === courseId);

export function coursePct(lessons: Lesson[], courseId: string, map: Record<string, LessonResult | undefined>) {
  const ls = lessonsOf(lessons, courseId);
  if (!ls.length) return 0;
  return Math.round((100 * ls.filter((l) => map[l.id]?.passed).length) / ls.length);
}
export const courseDone = (lessons: Lesson[], courseId: string, map: Record<string, LessonResult | undefined>) =>
  lessonsOf(lessons, courseId).length > 0 && coursePct(lessons, courseId, map) === 100;

export function pathInfo(path: Path, person: Pick<Person, "pathStart">, courses: Course[], lessons: Lesson[], map: Record<string, LessonResult | undefined>) {
  const ids = path.courseIds.filter((id) => courses.some((c) => c.id === id));
  const done = ids.filter((id) => courseDone(lessons, id, map)).length;
  const due = person.pathStart && path.dueDays ? new Date(person.pathStart.getTime() + path.dueDays * DAY) : null;
  return { ids, done, total: ids.length, due, overdue: !!due && Date.now() > due.getTime() && done < ids.length };
}

export function lessonStatus(r?: LessonResult) {
  if (!r) return { key: "new", label: "Not started" } as const;
  if (r.passed) return { key: "pass", label: `Passed ${r.best}%` } as const;
  if (r.attempts) return { key: "fail", label: `Retake · best ${r.best}%` } as const;
  if (r.watched) return { key: "watch", label: "Watched" } as const;
  return { key: "new", label: "Not started" } as const;
}

export const fmtDate = (d?: Date | null) =>
  d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
