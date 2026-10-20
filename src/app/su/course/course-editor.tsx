"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Label } from "@/components/ui";
import { formatDuration } from "@/lib/course";
import {
  deleteLesson,
  moveLesson,
  saveLesson,
  saveModule,
  setCoursePublished,
  type SuResult,
} from "../actions";

export type CourseTree = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  modules: {
    id: string;
    title: string;
    summary: string | null;
    lessons: {
      id: string;
      title: string;
      description: string | null;
      durationSec: number;
      bunnyVideoId: string | null;
    }[];
  }[];
};

type Lesson = CourseTree["modules"][number]["lessons"][number];

function LessonForm({
  moduleId,
  lesson,
  onDone,
  pending,
  submit,
}: {
  moduleId: string;
  lesson?: Lesson;
  onDone: () => void;
  pending: boolean;
  submit: (fd: FormData) => void;
}) {
  const min = lesson ? Math.floor(lesson.durationSec / 60) : 5;
  const sec = lesson ? lesson.durationSec % 60 : 0;

  return (
    <form
      action={submit}
      className="mt-[var(--space-3)] grid gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-deep)] p-[var(--space-4)] sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={lesson?.id ?? ""} />
      <input type="hidden" name="module_id" value={moduleId} />

      <div className="sm:col-span-2">
        <Field label="Назва уроку">
          <Input
            name="title"
            required
            minLength={2}
            defaultValue={lesson?.title ?? ""}
            placeholder="Погляд і привітання"
          />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Опис" hint="Один рядок під відео. Можна лишити порожнім.">
          <Input
            name="description"
            defaultValue={lesson?.description ?? ""}
            placeholder="Чому перші сім секунд вирішують усе"
          />
        </Field>
      </div>

      <Field label="Хвилин">
        <Input name="minutes" type="number" min={0} max={600} defaultValue={min} />
      </Field>
      <Field label="Секунд">
        <Input name="seconds" type="number" min={0} max={59} defaultValue={sec} />
      </Field>

      <div className="sm:col-span-2">
        <Field
          label="Bunny video id"
          hint="Поки порожньо — урок показує плеєр-заглушку. Заповниться, коли буде підключений Bunny."
        >
          <Input
            name="bunny_video_id"
            defaultValue={lesson?.bunnyVideoId ?? ""}
            placeholder="ще немає"
          />
        </Field>
      </div>

      <div className="flex gap-[var(--space-3)] sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Зберігаємо…" : lesson ? "Зберегти" : "Додати урок"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}

export function CourseEditor({ tree }: { tree: CourseTree }) {
  const [state, setState] = useState<SuResult>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addingModule, setAddingModule] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<SuResult>, after?: () => void) {
    startTransition(async () => {
      const r = await fn();
      setState(r);
      if (!r.error) after?.();
    });
  }

  const totalLessons = tree.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <>
      <div className="mb-[var(--space-6)] flex flex-wrap items-start justify-between gap-[var(--space-4)]">
        <div>
          <Label>Курс</Label>
          <h1 className="mt-[var(--space-1)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
            {tree.title}
          </h1>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            {tree.modules.length} модулів · {totalLessons} уроків
          </p>
        </div>

        <div className="flex flex-col items-end gap-[var(--space-2)]">
          <span
            className={
              "rounded-[var(--radius-full)] px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] " +
              (tree.isPublished
                ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]")
            }
          >
            {tree.isPublished ? "опубліковано" : "чернетка"}
          </span>
          <Button
            variant="neutral"
            disabled={pending}
            onClick={() => run(() => setCoursePublished(tree.id, !tree.isPublished))}
          >
            {tree.isPublished ? "Зняти з публікації" : "Опублікувати"}
          </Button>
        </div>
      </div>

      {!tree.isPublished && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="warning">
            Поки курс не опублікований, офіціанти не бачать жодного уроку —
            і прогрес не рахується.
          </Alert>
        </div>
      )}
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
        {tree.modules.map((mod, mi) => (
          <Card key={mod.id}>
            <Label>Модуль {mi + 1}</Label>
            <h2 className="mt-[var(--space-1)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
              {mod.title}
            </h2>
            {mod.summary && (
              <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                {mod.summary}
              </p>
            )}

            <ul className="mt-[var(--space-4)] flex flex-col">
              {mod.lessons.map((l, li) => (
                <li
                  key={l.id}
                  className="border-b border-[var(--color-border)] py-[var(--space-2)] last:border-0"
                >
                  <div className="flex flex-wrap items-center gap-[var(--space-3)]">
                    <span className="min-w-0 flex-1 truncate">
                      {li + 1}. {l.title}
                      {!l.bunnyVideoId && (
                        <span className="ml-[var(--space-2)] text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">
                          без відео
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                      {formatDuration(l.durationSec)}
                    </span>
                    <span className="flex shrink-0 gap-[var(--space-1)]">
                      <Button
                        variant="ghost"
                        aria-label="Вище"
                        disabled={pending || li === 0}
                        onClick={() => run(() => moveLesson(l.id, -1))}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="Нижче"
                        disabled={pending || li === mod.lessons.length - 1}
                        onClick={() => run(() => moveLesson(l.id, 1))}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setEditing(editing === l.id ? null : l.id)
                        }
                      >
                        Змінити
                      </Button>
                      {confirmDelete === l.id ? (
                        <>
                          <Button
                            variant="danger"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => deleteLesson(l.id),
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
                          onClick={() => setConfirmDelete(l.id)}
                        >
                          ✕
                        </Button>
                      )}
                    </span>
                  </div>

                  {editing === l.id && (
                    <LessonForm
                      moduleId={mod.id}
                      lesson={l}
                      pending={pending}
                      onDone={() => setEditing(null)}
                      submit={(fd) =>
                        run(
                          () => saveLesson(fd),
                          () => setEditing(null),
                        )
                      }
                    />
                  )}
                </li>
              ))}
            </ul>

            {addingTo === mod.id ? (
              <LessonForm
                moduleId={mod.id}
                pending={pending}
                onDone={() => setAddingTo(null)}
                submit={(fd) =>
                  run(
                    () => saveLesson(fd),
                    () => setAddingTo(null),
                  )
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingTo(mod.id)}
                className="mt-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
              >
                + Додати урок
              </button>
            )}
          </Card>
        ))}

        {addingModule ? (
          <Card>
            <Label>Новий модуль</Label>
            <form
              action={(fd) =>
                run(
                  () => saveModule(fd),
                  () => setAddingModule(false),
                )
              }
              className="mt-[var(--space-3)] grid gap-[var(--space-4)]"
            >
              <input type="hidden" name="course_id" value={tree.id} />
              <Field label="Назва">
                <Input name="title" required minLength={2} placeholder="Складні ситуації" />
              </Field>
              <Field label="Короткий опис">
                <Input name="summary" placeholder="Скарга, помилка кухні, конфлікт" />
              </Field>
              <div className="flex gap-[var(--space-3)]">
                <Button type="submit" disabled={pending}>
                  Додати модуль
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddingModule(false)}
                >
                  Скасувати
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button variant="neutral" onClick={() => setAddingModule(true)}>
            + Додати модуль
          </Button>
        )}
      </div>
    </>
  );
}
