import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, t } from "@/db";
import { requireAdmin } from "@/lib/session";
import { loadCatalog } from "@/lib/data";
import { aiConfigured } from "@/lib/ai";
import { Band } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { LessonEditor } from "@/components/LessonEditor";

export default async function EditLesson({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { course } = await searchParams;
  const isNew = id === "new";
  const [l] = isNew ? [] : await db().select().from(t.lessons).where(eq(t.lessons.id, id));
  const { courses, lessons } = await loadCatalog();
  const courseId = l?.courseId ?? course ?? courses[0]?.id ?? "";
  return (
    <>
      <Band eyebrow="Manage" title={isNew ? "New lesson" : "Edit lesson"} />
      <main>
        <div><Link className="link" href="/admin/content">← Manage</Link></div>
        {courses.length === 0 ? <div className="notice">Add a course first.</div> : (
          <LessonEditor
            courses={courses.map((c) => ({ id: c.id, title: c.title }))}
            aiReady={aiConfigured()}
            blobMode={process.env.BLOB_READ_WRITE_TOKEN ? "token" : process.env.BLOB_STORE_ID ? "presigned" : null}
            initial={l ?? { id: "", courseId, title: "", order: lessons.filter((x) => x.courseId === courseId).length + 1, minutes: null, passScore: 80, keyPoints: "", videoUrl: null, videoLink: null, quiz: [] }}
          />
        )}
        {!isNew && <DeleteButton kind="lessons" id={id} label="Delete lesson" />}
      </main>
    </>
  );
}
