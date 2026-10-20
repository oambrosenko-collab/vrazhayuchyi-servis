"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Label } from "@/components/ui";
import {
  deleteQuestion,
  saveQuestion,
  setPassScore,
  type SuResult,
} from "../actions";

export type QuizNode = {
  id: string;
  title: string;
  moduleTitle: string | null;
  passScore: number;
  isFinal: boolean;
  questions: {
    id: string;
    prompt: string;
    topic: string;
    options: { id: string; label: string; isCorrect: boolean }[];
  }[];
};

type Question = QuizNode["questions"][number];

/**
 * One question with its options.
 *
 * The correct answer is a radio across the whole set rather than a
 * checkbox per option — the database refuses anything but exactly one,
 * so letting the form express two would only produce an error later.
 */
function QuestionForm({
  quizId,
  question,
  pending,
  onDone,
  submit,
}: {
  quizId: string;
  question?: Question;
  pending: boolean;
  onDone: () => void;
  submit: (fd: FormData) => void;
}) {
  const initial = question?.options.map((o) => o.label) ?? ["", "", ""];
  const [labels, setLabels] = useState<string[]>(initial);
  const [correct, setCorrect] = useState(
    Math.max(question?.options.findIndex((o) => o.isCorrect) ?? 0, 0),
  );

  return (
    <form
      action={submit}
      className="mt-[var(--space-3)] flex flex-col gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-deep)] p-[var(--space-4)]"
    >
      <input type="hidden" name="id" value={question?.id ?? ""} />
      <input type="hidden" name="quiz_id" value={quizId} />
      <input type="hidden" name="correct" value={correct} />

      <Field label="Питання">
        <Input
          name="prompt"
          required
          minLength={4}
          defaultValue={question?.prompt ?? ""}
          placeholder="Коли подавати меню?"
        />
      </Field>

      <Field
        label="Тема"
        hint="Її побачить той, хто завалив тест, як підказку що переглянути."
      >
        <Input
          name="topic"
          required
          minLength={2}
          defaultValue={question?.topic ?? ""}
          placeholder="Посадка"
        />
      </Field>

      <div className="flex flex-col gap-[var(--space-2)]">
        <Label>Варіанти · познач правильний</Label>
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-[var(--space-3)]">
            <button
              type="button"
              role="radio"
              aria-checked={correct === i}
              aria-label={`Правильний варіант ${i + 1}`}
              onClick={() => setCorrect(i)}
              className={
                "flex h-[var(--tap-min)] w-[var(--tap-min)] shrink-0 items-center justify-center rounded-[var(--radius-full)] border " +
                (correct === i
                  ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]"
                  : "border-[var(--color-border-strong)] text-[var(--color-text-muted)]")
              }
            >
              {correct === i ? "✓" : ""}
            </button>
            <Input
              name="option"
              value={label}
              onChange={(e) =>
                setLabels((prev) =>
                  prev.map((v, j) => (j === i ? e.target.value : v)),
                )
              }
              placeholder={`Варіант ${i + 1}`}
            />
            {labels.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                aria-label="Прибрати варіант"
                onClick={() => {
                  setLabels((prev) => prev.filter((_, j) => j !== i));
                  // Keep the mark on the same option after a removal.
                  setCorrect((c) => (c > i ? c - 1 : c === i ? 0 : c));
                }}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLabels((prev) => [...prev, ""])}
          className="w-fit text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
        >
          + Ще варіант
        </button>
      </div>

      <div className="flex gap-[var(--space-3)]">
        <Button type="submit" disabled={pending}>
          {pending ? "Зберігаємо…" : question ? "Зберегти" : "Додати питання"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}

export function QuizEditor({ quizzes }: { quizzes: QuizNode[] }) {
  const [state, setState] = useState<SuResult>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<SuResult>, after?: () => void) {
    startTransition(async () => {
      const r = await fn();
      setState(r);
      if (!r.error) after?.();
    });
  }

  return (
    <>
      <h1 className="mb-[var(--space-6)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        Тести
      </h1>

      {state.ok && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="success">{state.ok}</Alert>
        </div>
      )}
      {state.error && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}

      <div className="flex flex-col gap-[var(--space-4)]">
        {quizzes.map((quiz) => (
          <Card key={quiz.id}>
            <div className="flex flex-wrap items-start justify-between gap-[var(--space-4)]">
              <div>
                <Label>{quiz.isFinal ? "Фінальний" : "Тест модуля"}</Label>
                <h2 className="mt-[var(--space-1)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
                  {quiz.title}
                </h2>
                <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                  {quiz.questions.length} питань
                </p>
              </div>

              <div className="flex items-center gap-[var(--space-2)]">
                <Label>Прохідний</Label>
                <select
                  defaultValue={quiz.passScore}
                  disabled={pending}
                  onChange={(e) =>
                    run(() => setPassScore(quiz.id, Number(e.target.value)))
                  }
                  className="min-h-[var(--tap-min)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-[var(--space-3)] text-[length:var(--text-body)] text-[var(--color-text)]"
                >
                  {[60, 70, 80, 90, 100].map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ul className="mt-[var(--space-4)] flex flex-col">
              {quiz.questions.map((q, qi) => (
                <li
                  key={q.id}
                  className="border-b border-[var(--color-border)] py-[var(--space-3)] last:border-0"
                >
                  <div className="flex flex-wrap items-start gap-[var(--space-3)]">
                    <div className="min-w-0 flex-1">
                      <p>
                        {qi + 1}. {q.prompt}
                      </p>
                      <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                        тема: {q.topic} ·{" "}
                        <span className="text-[var(--color-success)]">
                          {q.options.find((o) => o.isCorrect)?.label ??
                            "правильної немає"}
                        </span>
                      </p>
                    </div>
                    <span className="flex shrink-0 gap-[var(--space-1)]">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setEditing(editing === q.id ? null : q.id)
                        }
                      >
                        Змінити
                      </Button>
                      {confirmDelete === q.id ? (
                        <>
                          <Button
                            variant="danger"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => deleteQuestion(q.id),
                                () => setConfirmDelete(null),
                              )
                            }
                          >
                            Видалити
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Ні
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmDelete(q.id)}
                        >
                          ✕
                        </Button>
                      )}
                    </span>
                  </div>

                  {editing === q.id && (
                    <QuestionForm
                      key={`edit-${q.id}`}
                      quizId={quiz.id}
                      question={q}
                      pending={pending}
                      onDone={() => setEditing(null)}
                      submit={(fd) =>
                        run(
                          () => saveQuestion(fd),
                          () => setEditing(null),
                        )
                      }
                    />
                  )}
                </li>
              ))}
            </ul>

            {addingTo === quiz.id ? (
              <QuestionForm
                key={`new-${quiz.id}`}
                quizId={quiz.id}
                pending={pending}
                onDone={() => setAddingTo(null)}
                submit={(fd) =>
                  run(
                    () => saveQuestion(fd),
                    () => setAddingTo(null),
                  )
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingTo(quiz.id)}
                className="mt-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
              >
                + Додати питання
              </button>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
