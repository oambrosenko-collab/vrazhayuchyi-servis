import { connection } from "next/server";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { QuizEditor, type QuizNode } from "./quiz-editor";

export const instant = false;
export const metadata = { title: "Тести · Платформа" };

export default async function QuizzesPage() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("su_quiz_tree");

  if (error) {
    return <Alert tone="danger">Не вдалося завантажити тести.</Alert>;
  }
  if (!data || data.length === 0) {
    return <Alert tone="info">Тестів ще немає.</Alert>;
  }

  // One row per option; quiz and question repeat. A quiz with no
  // questions still arrives as a single row with nulls.
  const quizzes: QuizNode[] = [];
  for (const row of data) {
    let quiz = quizzes.find((q) => q.id === row.quiz_id);
    if (!quiz) {
      quiz = {
        id: row.quiz_id,
        title: row.quiz_title,
        moduleTitle: row.module_title,
        passScore: row.pass_score,
        isFinal: row.is_final,
        questions: [],
      };
      quizzes.push(quiz);
    }
    if (!row.question_id) continue;

    let q = quiz.questions.find((x) => x.id === row.question_id);
    if (!q) {
      q = {
        id: row.question_id,
        prompt: row.prompt ?? "",
        topic: row.topic ?? "",
        options: [],
      };
      quiz.questions.push(q);
    }
    if (row.option_id) {
      q.options.push({
        id: row.option_id,
        label: row.label ?? "",
        isCorrect: row.is_correct ?? false,
      });
    }
  }

  return <QuizEditor quizzes={quizzes} />;
}
