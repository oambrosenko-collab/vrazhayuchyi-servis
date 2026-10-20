"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type QuizResult = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  weakTopics: string[] | null;
};

const REASONS: Record<string, string> = {
  no_access: "Доступ до курсу закінчився. Звернись до управляючого.",
  not_authenticated: "Сесія закінчилась. Увійди ще раз.",
  quiz_not_found: "Тест не знайдено.",
  quiz_empty: "У цьому тесті ще немає питань.",
};

/**
 * Sends the answers for grading. Nothing is decided here — the score,
 * the pass mark and which topics were weak all come back from the
 * database, because the browser is not a trustworthy judge of its own
 * answers.
 */
export async function submitQuiz(
  quizId: string,
  answers: Record<string, string>,
): Promise<QuizResult | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_quiz_attempt", {
    p_quiz_id: quizId,
    p_answers: answers,
  });

  if (error) return { error: "Не вдалося перевірити тест. Спробуй ще раз." };

  const row = data?.[0];
  if (!row?.out_ok) {
    return {
      error:
        (row?.out_reason && REASONS[row.out_reason]) ??
        "Щось пішло не так. Спробуй ще раз за хвилину.",
    };
  }

  revalidatePath("/learn");
  revalidatePath("/learn/certificate");

  return {
    score: row.out_score,
    passed: row.out_passed,
    correct: row.out_correct,
    total: row.out_total,
    weakTopics: row.out_weak_topics,
  };
}
