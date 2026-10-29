/**
 * Loads the starter content (courses, lessons, quizzes, scenarios, spec challenges, paths).
 *   npm run db:seed            → adds anything missing; never touches content you've edited (runs on every deploy)
 *   npm run db:seed -- --reset → overwrites the starter items with the original versions
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { sql } from "drizzle-orm";
import { db, t } from "./index";
import raw from "./seed-data.json";

const data = { ...raw, scenarios: raw.scenarios.map((s) => ({ ...s, level: s.level as "beginner" | "experienced" })) };
const RESET = process.argv.includes("--reset");

async function main() {
  const d = db();
  if (!RESET) {
    const before = new Set((await d.select({ id: t.courses.id }).from(t.courses)).map((c) => c.id));
    await d.insert(t.courses).values(data.courses).onConflictDoNothing();
    await d.insert(t.lessons).values(data.lessons.map((l) => ({ ...l, videoUrl: null, videoLink: null }))).onConflictDoNothing();
    await d.insert(t.scenarios).values(data.scenarios).onConflictDoNothing();
    await d.insert(t.specs).values(data.specs).onConflictDoNothing();
    await d.insert(t.paths).values(data.paths).onConflictDoNothing();
    // Courses that are brand new in this release get added to existing learning paths that include them,
    // without removing or reordering anything an admin changed.
    const fresh = new Set(data.courses.map((c) => c.id).filter((id) => before.size > 0 && !before.has(id)));
    if (fresh.size) {
      const live = await d.select().from(t.paths);
      for (const p of data.paths) {
        const cur = live.find((x) => x.id === p.id);
        if (!cur) continue;
        const add = p.courseIds.filter((c) => fresh.has(c) && !cur.courseIds.includes(c));
        if (!add.length) continue;
        const front = add.filter((c) => c === "c-welcome");
        const back = add.filter((c) => c !== "c-welcome");
        await d.update(t.paths).set({ courseIds: [...front, ...cur.courseIds, ...back] }).where(sql`${t.paths.id} = ${p.id}`);
        console.log(`Seed: added ${add.join(", ")} to path ${p.id}.`);
      }
    }
    // Tag existing starter scenarios with their topic (e.g. ABB) if they don't have one yet.
    for (const s of data.scenarios) {
      if (s.topic) await d.update(t.scenarios).set({ topic: s.topic }).where(sql`${t.scenarios.id} = ${s.id} and ${t.scenarios.topic} = ''`);
    }
    console.log("Seed: added any missing starter content.");
    return;
  }
  for (const c of data.courses) {
    await d.insert(t.courses).values(c).onConflictDoUpdate({ target: t.courses.id, set: { title: c.title, category: c.category, summary: c.summary, order: c.order } });
  }
  for (const l of data.lessons) {
    await d.insert(t.lessons).values({ ...l, videoUrl: null, videoLink: null })
      .onConflictDoUpdate({ target: t.lessons.id, set: { courseId: l.courseId, title: l.title, order: l.order, minutes: l.minutes, passScore: l.passScore, keyPoints: l.keyPoints, quiz: l.quiz } });
  }
  for (const s of data.scenarios) {
    await d.insert(t.scenarios).values(s).onConflictDoUpdate({ target: t.scenarios.id, set: { ...s, id: undefined } as never });
  }
  for (const s of data.specs) {
    await d.insert(t.specs).values(s).onConflictDoUpdate({ target: t.specs.id, set: { ...s, id: undefined } as never });
  }
  for (const p of data.paths) {
    await d.insert(t.paths).values(p).onConflictDoUpdate({ target: t.paths.id, set: { name: p.name, order: p.order, dueDays: p.dueDays, courseIds: p.courseIds } });
  }
  const [{ n }] = await d.execute<{ n: number }>(sql`select count(*)::int as n from lessons`).then((r) => r.rows as { n: number }[]);
  console.log(`Seeded: ${data.courses.length} courses, ${n} lessons, ${data.scenarios.length} scenarios, ${data.specs.length} spec challenges, ${data.paths.length} paths.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
