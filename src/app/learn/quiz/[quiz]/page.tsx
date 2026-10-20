import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Label, Screen } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuizRunner, type Question } from "./quiz-runner";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Тест · Вражаючий сервіс" };

/**
 * The route carries the quiz id rather than the module id the PRD's page
 * map suggests. `/learn/[module]/quiz` cannot coexist with the existing
 * `/learn/[lesson]`: two different dynamic params at the same segment
 * refuse to build. This also gives the final test, which belongs to no
 * module, the same route as every other one.
 */
export default async function QuizPage({ params }: PageProps<"/learn/quiz/[quiz]">) {
  await connection();
  await requireActiveUser();

  const { quiz: quizId } = await params;
  const supabase = await createClient();

  const [{ data: sheet }, { data: quizzes }] = await Promise.all([
    supabase.rpc("quiz_sheet", { p_quiz_id: quizId }),
    supabase.rpc("course_quizzes"),
  ]);

  // RLS already hid it if access expired, so a miss is a 404 either way.
  if (!sheet || sheet.length === 0) notFound();

  const meta = quizzes?.find((q) => q.quiz_id === quizId);

  // Rows arrive one per option, pre-shuffled by question. Group them
  // without re-sorting: the server decided the order.
  const questions: Question[] = [];
  for (const row of sheet) {
    let q = questions.at(-1);
    if (!q || q.id !== row.question_id) {
      q = { id: row.question_id, prompt: row.prompt, options: [] };
      questions.push(q);
    }
    q.options.push({ id: row.option_id, label: row.label });
  }

  return (
    <Screen>
      <Link
        href="/learn"
        className="mb-[var(--space-4)] block w-fit text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
      >
        ← До курсу
      </Link>

      <Label>
        Тест · прохідний бал {sheet[0].pass_score}%
        {meta?.attempts ? ` · спроб: ${meta.attempts}` : ""}
      </Label>
      <h1 className="mt-[var(--space-2)] mb-[var(--space-6)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        {sheet[0].quiz_title}
      </h1>

      <QuizRunner
        quizId={quizId}
        questions={questions}
        passScore={sheet[0].pass_score}
      />
    </Screen>
  );
}
