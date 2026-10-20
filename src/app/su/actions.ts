"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SuResult = { ok?: string; error?: string };

/**
 * Every call here lands on an RPC that re-checks superadmin inside the
 * function. The layout guard stops a stranger seeing the page; this is
 * what stops one calling the action directly.
 */
async function rpcGuard(
  // PromiseLike, not Promise: the Supabase query builder is thenable but
  // is not a Promise until it is awaited.
  run: () => PromiseLike<{ data: unknown; error: unknown }>,
  okMessage: string,
  failMessage: string,
): Promise<SuResult> {
  const { data, error } = await run();
  if (error) {
    // Postgres raises 42501 when the guard rejects; anything else is a bug
    // on our side, and neither should leak its detail to the browser.
    return { error: failMessage };
  }
  const row = (data as { out_ok?: boolean }[] | null)?.[0];
  if (row && row.out_ok === false) return { error: failMessage };
  return { ok: okMessage };
}

function revalidateSu() {
  revalidatePath("/su");
  revalidatePath("/su/orgs");
  revalidatePath("/su/course");
  revalidatePath("/su/quizzes");
  // The learner and admin screens read the same content.
  revalidatePath("/learn");
  revalidatePath("/admin");
}

/* ------------------------------- orgs ------------------------------- */

export async function createOrganization(form: FormData): Promise<SuResult> {
  const name = String(form.get("name") ?? "").trim();
  const seats = Number(form.get("package_size"));
  const email = String(form.get("admin_email") ?? "").trim();
  const months = Number(form.get("months") ?? 12);

  if (name.length < 2) return { error: "Назва закладу закоротка." };
  if (!Number.isInteger(seats) || seats < 1 || seats > 1000) {
    return { error: "Кількість місць — від 1 до 1000." };
  }
  if (!email.includes("@")) return { error: "Вкажи пошту власника." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_provision_organization", {
    p_name: name,
    p_package_size: seats,
    p_admin_email: email,
    p_months: months,
  });

  if (error || !data?.[0]) return { error: "Не вдалося створити заклад." };

  revalidateSu();
  return { ok: `Заклад «${data[0].name}» створено.` };
}

export async function extendAccess(
  orgId: string,
  months: number,
): Promise<SuResult> {
  const supabase = await createClient();
  return rpcGuard(
    () => supabase.rpc("su_extend_access", { p_org: orgId, p_months: months }),
    `Доступ продовжено на ${months} міс.`,
    "Не вдалося продовжити доступ.",
  ).then((r) => {
    revalidateSu();
    return r;
  });
}

export async function addSeats(
  orgId: string,
  delta: number,
): Promise<SuResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_add_seats", {
    p_org: orgId,
    p_delta: delta,
  });
  if (error) return { error: "Не вдалося змінити кількість місць." };
  if (!data?.[0]?.out_ok) {
    return {
      error: "Не можна зробити пакет меншим за вже зайняті місця.",
    };
  }
  revalidateSu();
  return { ok: `Тепер у пакеті ${data[0].out_package_size} місць.` };
}

export async function setOrgStatus(
  orgId: string,
  status: "trial" | "active" | "expired" | "suspended",
): Promise<SuResult> {
  const supabase = await createClient();
  const r = await rpcGuard(
    () => supabase.rpc("su_set_org_status", { p_org: orgId, p_status: status }),
    "Статус змінено.",
    "Не вдалося змінити статус.",
  );
  revalidateSu();
  return r;
}

/* ------------------------------ course ------------------------------ */

export async function setCoursePublished(
  courseId: string,
  published: boolean,
): Promise<SuResult> {
  const supabase = await createClient();
  const r = await rpcGuard(
    () =>
      supabase.rpc("su_set_course_published", {
        p_course: courseId,
        p_published: published,
      }),
    published ? "Курс опубліковано." : "Курс знято з публікації.",
    "Не вдалося змінити публікацію.",
  );
  revalidateSu();
  return r;
}

export async function saveModule(form: FormData): Promise<SuResult> {
  const id = (String(form.get("id") ?? "") || null) as string | null;
  const courseId = String(form.get("course_id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const summary = String(form.get("summary") ?? "").trim() || null;

  if (title.length < 2) return { error: "Назва модуля закоротка." };

  const supabase = await createClient();
  const r = await rpcGuard(
    () =>
      supabase.rpc("su_save_module", {
        p_id: id,
        p_course: courseId,
        p_title: title,
        p_summary: summary,
      }),
    id ? "Модуль оновлено." : "Модуль додано.",
    "Не вдалося зберегти модуль.",
  );
  revalidateSu();
  return r;
}

export async function saveLesson(form: FormData): Promise<SuResult> {
  const id = (String(form.get("id") ?? "") || null) as string | null;
  const moduleId = String(form.get("module_id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const bunny = String(form.get("bunny_video_id") ?? "").trim() || null;

  // The form asks for minutes and seconds, because nobody thinks about a
  // lesson as 210 seconds.
  const min = Number(form.get("minutes") ?? 0);
  const sec = Number(form.get("seconds") ?? 0);
  const duration = Math.round(min * 60 + sec);

  if (title.length < 2) return { error: "Назва уроку закоротка." };
  if (!Number.isFinite(duration) || duration < 1 || duration > 36000) {
    return { error: "Тривалість — від 1 секунди до 10 годин." };
  }

  const supabase = await createClient();
  const r = await rpcGuard(
    () =>
      supabase.rpc("su_save_lesson", {
        p_id: id,
        p_module: moduleId,
        p_title: title,
        p_description: description,
        p_duration_sec: duration,
        p_bunny_video_id: bunny,
      }),
    id ? "Урок оновлено." : "Урок додано.",
    "Не вдалося зберегти урок.",
  );
  revalidateSu();
  return r;
}

export async function moveLesson(
  lessonId: string,
  direction: -1 | 1,
): Promise<SuResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_move_lesson", {
    p_id: lessonId,
    p_direction: direction,
  });
  if (error) return { error: "Не вдалося перемістити урок." };
  revalidateSu();
  // Hitting the end of a list is not an error worth a red banner.
  return data?.[0]?.out_ok ? { ok: "Порядок змінено." } : {};
}

export async function deleteLesson(lessonId: string): Promise<SuResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_delete_lesson", {
    p_id: lessonId,
  });
  if (error) return { error: "Не вдалося видалити урок." };

  const reason = data?.[0]?.out_reason;
  if (reason === "has_progress") {
    return {
      error:
        "Урок уже хтось дивився. Видалення стерло б цей прогрес зі звітів — зніми курс із публікації замість цього.",
    };
  }
  if (!data?.[0]?.out_ok) return { error: "Урок не знайдено." };

  revalidateSu();
  return { ok: "Урок видалено." };
}

/* ----------------------------- questions ---------------------------- */

export async function saveQuestion(form: FormData): Promise<SuResult> {
  const id = (String(form.get("id") ?? "") || null) as string | null;
  const quizId = String(form.get("quiz_id") ?? "");
  const prompt = String(form.get("prompt") ?? "").trim();
  const topic = String(form.get("topic") ?? "").trim();
  const correct = String(form.get("correct") ?? "0");

  const labels = form
    .getAll("option")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (prompt.length < 4) return { error: "Питання закоротке." };
  if (topic.length < 2) {
    return { error: "Вкажи тему — її побачить той, хто завалив тест." };
  }
  if (labels.length < 2) return { error: "Потрібно щонайменше два варіанти." };

  const correctIndex = Number(correct);
  if (!Number.isInteger(correctIndex) || !labels[correctIndex]) {
    return { error: "Познач, який варіант правильний." };
  }

  const options = labels.map((label, i) => ({
    label,
    is_correct: i === correctIndex,
  }));

  const supabase = await createClient();
  const r = await rpcGuard(
    () =>
      supabase.rpc("su_save_question", {
        p_id: id,
        p_quiz: quizId,
        p_prompt: prompt,
        p_topic: topic,
        p_options: options,
      }),
    id ? "Питання оновлено." : "Питання додано.",
    "Не вдалося зберегти питання.",
  );
  revalidateSu();
  return r;
}

export async function deleteQuestion(questionId: string): Promise<SuResult> {
  const supabase = await createClient();
  const r = await rpcGuard(
    () => supabase.rpc("su_delete_question", { p_id: questionId }),
    "Питання видалено.",
    "Не вдалося видалити питання.",
  );
  revalidateSu();
  return r;
}

export async function setPassScore(
  quizId: string,
  score: number,
): Promise<SuResult> {
  const supabase = await createClient();
  const r = await rpcGuard(
    () => supabase.rpc("su_set_pass_score", { p_quiz: quizId, p_score: score }),
    `Прохідний бал — ${score}%.`,
    "Не вдалося змінити прохідний бал.",
  );
  revalidateSu();
  return r;
}
