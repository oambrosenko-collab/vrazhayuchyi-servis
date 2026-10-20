import { connection } from "next/server";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CourseEditor, type CourseTree } from "./course-editor";

export const instant = false;
export const metadata = { title: "Курс · Платформа" };

export default async function CoursePage() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_course_tree");

  if (error) {
    return <Alert tone="danger">Не вдалося завантажити курс.</Alert>;
  }
  if (!data || data.length === 0) {
    return <Alert tone="info">Курсу ще немає в базі.</Alert>;
  }

  // Rows arrive flat, one per lesson, with the module repeated and a null
  // lesson for an empty module. Group once here so the editor is plain.
  const first = data[0];
  const tree: CourseTree = {
    id: first.course_id,
    title: first.course_title,
    slug: first.course_slug,
    isPublished: first.is_published,
    modules: [],
  };

  for (const row of data) {
    if (!row.module_id) continue;
    let mod = tree.modules.at(-1);
    if (!mod || mod.id !== row.module_id) {
      mod = {
        id: row.module_id,
        title: row.module_title ?? "",
        summary: row.module_summary,
        lessons: [],
      };
      tree.modules.push(mod);
    }
    if (row.lesson_id) {
      mod.lessons.push({
        id: row.lesson_id,
        title: row.lesson_title ?? "",
        description: row.lesson_desc,
        durationSec: row.duration_sec ?? 0,
        bunnyVideoId: row.bunny_video_id,
      });
    }
  }

  return <CourseEditor tree={tree} />;
}
