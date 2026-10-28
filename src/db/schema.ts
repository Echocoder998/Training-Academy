import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey, serial, uuid } from "drizzle-orm/pg-core";

export type QuizQuestion = { q: string; options: string[]; answer: number; why?: string };
export type ChatTurn = { role: "customer" | "rep"; text: string };
export type Grade = { score: number; uncovered: string[]; missed: string[]; recommendation: string; tips: string[] };

/* ─── People (one row per signed-in user) ─────────────────────── */
export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: text("role").$type<"learner" | "admin">().notNull().default("learner"),
  pathId: text("path_id"),
  pathStart: timestamp("path_start", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActive: timestamp("last_active", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── Content ─────────────────────────────────────────────────── */
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("General"),
  summary: text("summary").notNull().default(""),
  order: integer("order"),
});

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  order: integer("order"),
  minutes: integer("minutes"),
  passScore: integer("pass_score").notNull().default(80),
  keyPoints: text("key_points").notNull().default(""),
  videoUrl: text("video_url"),
  videoLink: text("video_link"),
  quiz: jsonb("quiz").$type<QuizQuestion[]>().notNull().default([]),
});

export const scenarios = pgTable("scenarios", {
  id: text("id").primaryKey(),
  num: integer("num").notNull(),
  industry: text("industry").notNull().default(""),
  title: text("title").notNull(),
  persona: text("persona").notNull().default(""),
  opening: text("opening").notNull(),
  hidden: text("hidden").notNull().default(""),
  goodRec: text("good_rec").notNull().default(""),
});

export const specs = pgTable("specs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  industry: text("industry").notNull().default(""),
  order: integer("order"),
  application: text("application").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  answer: integer("answer").notNull(),
  why: text("why").notNull().default(""),
});

export const paths = pgTable("paths", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order"),
  dueDays: integer("due_days"),
  courseIds: jsonb("course_ids").$type<string[]>().notNull().default([]),
});

/* ─── Results ─────────────────────────────────────────────────── */
export const lessonResults = pgTable("lesson_results", {
  personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  best: integer("best").notNull().default(0),
  last: integer("last"),
  attempts: integer("attempts").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  watched: boolean("watched").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.personId, t.lessonId] })]);

export const specResults = pgTable("spec_results", {
  personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  specId: text("spec_id").notNull().references(() => specs.id, { onDelete: "cascade" }),
  correct: boolean("correct").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.personId, t.specId] })]);

/** Every role-play call is kept (chat or voice), with its transcript, so managers can review them. */
export const roleplayAttempts = pgTable("roleplay_attempts", {
  id: serial("id").primaryKey(),
  personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  scenarioId: text("scenario_id").notNull().references(() => scenarios.id, { onDelete: "cascade" }),
  mode: text("mode").$type<"chat" | "voice">().notNull(),
  score: integer("score").notNull(),
  transcript: jsonb("transcript").$type<ChatTurn[]>().notNull(),
  grade: jsonb("grade").$type<Grade>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Person = typeof people.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type Spec = typeof specs.$inferSelect;
export type Path = typeof paths.$inferSelect;
export type LessonResult = typeof lessonResults.$inferSelect;
