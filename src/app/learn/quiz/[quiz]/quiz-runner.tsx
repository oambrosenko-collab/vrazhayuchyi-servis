"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, Button, Card, Label } from "@/components/ui";
import { submitQuiz, type QuizResult } from "@/app/learn/quiz/actions";

export type Question = {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
};

/** One question per screen, as the PRD asks — a waiter is on a phone. */
export function QuizRunner({
  quizId,
  questions,
  passScore,
}: {
  quizId: string;
  questions: Question[];
  passScore: number;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const question = questions[index];
  const chosen = question ? answers[question.id] : undefined;
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  function choose(optionId: string) {
    setAnswers((a) => ({ ...a, [question.id]: optionId }));
  }

  function submit() {
    startTransition(async () => {
      const res = await submitQuiz(quizId, answers);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setError(null);
      setResult(res);
      // The dashboard shows quiz state; it is stale the moment this lands.
      router.refresh();
    });
  }

  function retry() {
    setResult(null);
    setAnswers({});
    setIndex(0);
    // A fresh sheet means a fresh shuffle from the server.
    router.refresh();
  }

  /* ---------------- result ---------------- */
  if (result) {
    return (
      <div className="flex flex-col gap-[var(--space-6)]">
        <Card>
          <Label>Результат</Label>
          <p
            className={
              "mt-[var(--space-2)] text-[length:var(--text-display)] font-[var(--weight-bold)] " +
              (result.passed
                ? "text-[var(--color-success)]"
                : "text-[var(--color-danger)]")
            }
          >
            {result.score}%
          </p>
          <p className="mt-[var(--space-1)] text-[var(--color-text-secondary)]">
            {result.correct} правильних із {result.total} · прохідний{" "}
            {passScore}%
          </p>
        </Card>

        {result.passed ? (
          <Alert tone="success">Тест складено.</Alert>
        ) : (
          <Card>
            <Label>Що підтягнути</Label>
            <p className="mt-[var(--space-2)] mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              Перегляньте ці теми й спробуйте ще раз — спроби не обмежені.
            </p>
            <ul className="flex flex-col gap-[var(--space-2)]">
              {(result.weakTopics ?? []).map((t) => (
                <li
                  key={t}
                  className="rounded-[var(--radius-md)] bg-[var(--color-warning-soft)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--color-warning)]"
                >
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-col gap-[var(--space-3)]">
          {!result.passed && (
            <Button onClick={retry} full>
              Спробувати ще раз
            </Button>
          )}
          <Link
            href="/learn"
            className={
              "tap flex min-h-[var(--tap-min)] items-center justify-center rounded-[var(--radius-md)] px-[var(--space-4)] font-[var(--weight-semibold)] " +
              (result.passed
                ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]")
            }
          >
            До курсу
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- questions ---------------- */
  if (!question) return <Alert tone="danger">У цьому тесті немає питань.</Alert>;

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <div className="flex flex-col gap-[var(--space-2)]">
        <div className="flex items-baseline justify-between">
          <Label>
            Питання {index + 1} із {questions.length}
          </Label>
          <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            відповіли на {answeredCount}
          </span>
        </div>
        <div className="h-[6px] w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface)]">
          <div
            className="h-full bg-[var(--color-text-secondary)] transition-[width] duration-[var(--duration-base)]"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <p className="mb-[var(--space-4)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
          {question.prompt}
        </p>

        <div role="radiogroup" className="flex flex-col gap-[var(--space-2)]">
          {question.options.map((o) => {
            const selected = chosen === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(o.id)}
                className={
                  "flex min-h-[var(--tap-min)] items-center rounded-[var(--radius-md)] border px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors duration-[var(--duration-fast)] " +
                  (selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]")
                }
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </Card>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex gap-[var(--space-3)]">
        {index > 0 && (
          <Button variant="neutral" onClick={() => setIndex((i) => i - 1)}>
            Назад
          </Button>
        )}

        {isLast ? (
          <Button
            onClick={submit}
            full
            disabled={pending || answeredCount < questions.length}
          >
            {pending
              ? "Перевіряємо…"
              : answeredCount < questions.length
                ? `Лишилось ${questions.length - answeredCount}`
                : "Завершити тест"}
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)} full disabled={!chosen}>
            Далі
          </Button>
        )}
      </div>
    </div>
  );
}
