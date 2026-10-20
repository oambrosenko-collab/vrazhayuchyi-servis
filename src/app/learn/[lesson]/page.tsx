import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Label, Screen } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildOutline, formatDuration } from "@/lib/course";
import { LessonView } from "./lesson-view";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/learn/[lesson]">) {
  await connection();
  const { lesson } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("title")
    .eq("id", lesson)
    .maybeSingle();

  return { title: `${data?.title ?? "Урок"} · Вражаючий сервіс` };
}

export default async function LessonPage({
  params,
}: PageProps<"/learn/[lesson]">) {
  await connection();
  await requireActiveUser();

  const { lesson: lessonId } = await params;
  const supabase = await createClient();

  // The outline is needed anyway for "next lesson" and the position in the
  // course, and it already carries this lesson's progress — so one call
  // rather than two.
  const [{ data: rows }, { data: detail }] = await Promise.all([
    supabase.rpc("course_outline"),
    supabase
      .from("lessons")
      .select("id, title, description, materials, duration_sec")
      .eq("id", lessonId)
      .maybeSingle(),
  ]);

  // RLS already hid it if access expired or the seat was freed, so a miss
  // here is indistinguishable from a wrong id — both are a 404.
  if (!detail) notFound();

  const outline = buildOutline(rows ?? []);
  const index = outline.lessons.findIndex((l) => l.id === lessonId);
  const current = outline.lessons[index];
  if (!current) notFound();

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("position_sec")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const next = outline.lessons[index + 1] ?? null;

  const materials = Array.isArray(detail.materials)
    ? (detail.materials as { title?: string; url?: string }[]).filter(
        (m): m is { title: string; url: string } =>
          typeof m?.title === "string" && typeof m?.url === "string",
      )
    : [];

  return (
    <Screen>
      <Link
        href="/learn"
        className="mb-[var(--space-4)] block w-fit text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
      >
        ← До курсу
      </Link>

      <Label>
        Урок {index + 1} з {outline.total} · {formatDuration(current.durationSec)}
      </Label>
      <h1 className="mt-[var(--space-2)] mb-[var(--space-4)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        {detail.title}
      </h1>

      <LessonView
        lessonId={lessonId}
        durationSec={detail.duration_sec}
        initialPositionSec={progress?.position_sec ?? 0}
        initialWatchedSec={current.watchedSec}
        initialCompleted={current.completed}
        description={detail.description}
        materials={materials}
        next={next ? { id: next.id, title: next.title } : null}
      />
    </Screen>
  );
}
