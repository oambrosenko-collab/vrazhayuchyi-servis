import type { FunctionReturns } from "@/lib/supabase/types";

export type OutlineRow = FunctionReturns<"course_outline">;

export type LessonNode = {
  id: string;
  title: string;
  durationSec: number;
  hasVideo: boolean;
  watchedSec: number;
  completed: boolean;
};

export type ModuleNode = {
  id: string;
  title: string;
  lessons: LessonNode[];
};

export type Outline = {
  courseTitle: string;
  modules: ModuleNode[];
  lessons: LessonNode[]; // flat, in course order
  total: number;
  done: number;
  /** First unfinished lesson — what the big "Продовжити" button points at. */
  next: LessonNode | null;
};

/**
 * `course_outline` returns one flat row per lesson, already ordered by
 * module then lesson. Grouping it here keeps the SQL simple and the shape
 * convenient, and the flat list falls out for free — the player needs it to
 * know what "next lesson" means across a module boundary.
 */
export function buildOutline(rows: OutlineRow[]): Outline {
  const modules: ModuleNode[] = [];
  const flat: LessonNode[] = [];
  let courseTitle = "";

  for (const row of rows) {
    courseTitle ||= row.course_title;

    let mod = modules.at(-1);
    if (!mod || mod.id !== row.module_id) {
      mod = { id: row.module_id, title: row.module_title, lessons: [] };
      modules.push(mod);
    }

    const lesson: LessonNode = {
      id: row.lesson_id,
      title: row.lesson_title,
      durationSec: row.duration_sec,
      hasVideo: row.has_video,
      watchedSec: row.watched_sec,
      completed: row.completed,
    };
    mod.lessons.push(lesson);
    flat.push(lesson);
  }

  const done = flat.filter((l) => l.completed).length;

  return {
    courseTitle,
    modules,
    lessons: flat,
    total: flat.length,
    done,
    // Resuming means the first thing still unfinished, not the furthest
    // thing reached: someone who skipped lesson 2 should be sent back to it.
    next: flat.find((l) => !l.completed) ?? null,
  };
}

/** "3:30", "12:05" — durations here are minutes, never hours. */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
