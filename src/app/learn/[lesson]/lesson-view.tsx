"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, Card, Label } from "@/components/ui";
import { useProgress } from "../use-progress";
import { StubPlayer } from "./player";

type Props = {
  lessonId: string;
  durationSec: number;
  initialPositionSec: number;
  initialWatchedSec: number;
  initialCompleted: boolean;
  description: string | null;
  materials: { title: string; url: string }[];
  next: { id: string; title: string } | null;
};

export function LessonView({
  lessonId,
  durationSec,
  initialPositionSec,
  initialWatchedSec,
  initialCompleted,
  description,
  materials,
  next,
}: Props) {
  const router = useRouter();
  const progress = useProgress({
    lessonId,
    durationSec,
    initialWatchedSec,
    initialCompleted,
  });

  // The dashboard and the module ticks are server-rendered, so once this
  // lesson counts they are stale. Refresh quietly rather than making the
  // waiter wonder why the checkmark is missing when they go back.
  useEffect(() => {
    if (progress.justCompleted) router.refresh();
  }, [progress.justCompleted, router]);

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <StubPlayer
        durationSec={durationSec}
        initialPositionSec={initialPositionSec}
        onTick={progress.report}
        credited={progress.completed}
      />

      {progress.error && <Alert tone="danger">{progress.error}</Alert>}

      {progress.completed ? (
        <Alert tone="success">Урок зараховано.</Alert>
      ) : (
        <div className="flex flex-col gap-[var(--space-2)]">
          <div className="flex items-baseline justify-between">
            <Label>Переглянуто</Label>
            <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {progress.percent}% · зараховується на 90%
            </span>
          </div>
          <div className="h-[6px] w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface)]">
            <div
              className="h-full bg-[var(--color-text-secondary)] transition-[width] duration-[var(--duration-base)]"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {description && (
        <Card>
          <p className="text-[var(--color-text-secondary)]">{description}</p>
        </Card>
      )}

      {materials.length > 0 && (
        <Card>
          <Label>Матеріали</Label>
          <ul className="mt-[var(--space-3)] flex flex-col gap-[var(--space-2)]">
            {materials.map((m) => (
              <li key={m.url}>
                <a
                  href={m.url}
                  className="tap inline-flex items-center text-[var(--color-text)] underline"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {m.title}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {next ? (
        <Link
          href={`/learn/${next.id}`}
          // The accent belongs to one thing at a time. While the lesson is
          // unfinished, that thing is the play button; once it counts, it
          // becomes moving on.
          className={
            "tap flex min-h-[var(--tap-min)] items-center justify-between gap-[var(--space-4)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--weight-semibold)] " +
            (progress.completed
              ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]")
          }
        >
          <span>Наступний урок</span>
          <span className="text-[length:var(--text-sm)] font-[var(--weight-regular)] opacity-80">
            {next.title}
          </span>
        </Link>
      ) : (
        <Link
          href="/learn"
          className="tap flex min-h-[var(--tap-min)] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-4)] font-[var(--weight-semibold)]"
        >
          Це останній урок — до курсу
        </Link>
      )}
    </div>
  );
}
