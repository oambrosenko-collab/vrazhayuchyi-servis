import Link from "next/link";
import { connection } from "next/server";
import { Alert, Card, Label, Screen } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { IssueButton } from "./issue-button";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Сертифікат · Вражаючий сервіс" };

function Requirement({ done, text }: { done: boolean; text: string }) {
  return (
    <li className="flex min-h-[var(--tap-min)] items-center gap-[var(--space-3)]">
      <span
        aria-hidden
        className={
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-full)] text-[length:var(--text-xs)] " +
          (done
            ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
            : "border border-[var(--color-border-strong)] text-[var(--color-text-muted)]")
        }
      >
        {done ? "✓" : ""}
      </span>
      <span className={done ? "" : "text-[var(--color-text-secondary)]"}>
        {text}
      </span>
    </li>
  );
}

export default async function CertificatePage() {
  await connection();
  await requireActiveUser();

  const supabase = await createClient();
  const { data } = await supabase.rpc("certificate_status");
  const st = data?.[0];

  if (!st) {
    return (
      <Screen>
        <Alert tone="info">Курс ще не опублікований.</Alert>
      </Screen>
    );
  }

  const lessonsDone = st.lessons_done >= st.lessons_total && st.lessons_total > 0;
  const quizzesDone = st.quizzes_passed >= st.quizzes_total;

  return (
    <Screen>
      <Link
        href="/learn"
        className="mb-[var(--space-4)] block w-fit text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
      >
        ← До курсу
      </Link>

      <Label>Сертифікат</Label>
      <h1 className="mt-[var(--space-2)] mb-[var(--space-6)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        {st.course_title}
      </h1>

      {st.number ? (
        <>
          <Card className="mb-[var(--space-6)]">
            {/* A flat preview of the PDF, not an image of it: the document
                is generated on request, and rendering it twice would mean
                two places to keep in step. */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-deep)] p-[var(--space-8)] text-center">
              <p className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                Сертифікат про проходження
              </p>
              <p className="mt-[var(--space-4)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
                {st.full_name}
              </p>
              <p className="mt-[var(--space-2)] text-[var(--color-text-secondary)]">
                {st.org_name}
              </p>
              <p className="mt-[var(--space-6)] text-[length:var(--text-h3)]">
                {st.course_title}
              </p>
              <p className="mt-[var(--space-6)] font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                {st.number}
              </p>
            </div>
          </Card>

          {/* A route handler that streams a file, not a page: <Link>
              would client-navigate and the download would never start. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/learn/certificate/pdf"
            className="tap flex min-h-[var(--tap-min)] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-4)] font-[var(--weight-semibold)] text-[var(--color-text-on-accent)]"
          >
            Завантажити PDF
          </a>
        </>
      ) : (
        <>
          <Card className="mb-[var(--space-6)]">
            <Label>Що лишилось</Label>
            <ul className="mt-[var(--space-3)] flex flex-col">
              <Requirement
                done={lessonsDone}
                text={`Переглянути всі уроки — ${st.lessons_done} із ${st.lessons_total}`}
              />
              <Requirement
                done={quizzesDone}
                text={`Скласти всі тести — ${st.quizzes_passed} із ${st.quizzes_total}`}
              />
            </ul>
          </Card>

          {st.eligible ? (
            <IssueButton />
          ) : (
            <Alert tone="info">
              Сертифікат зʼявиться тут, щойно курс буде пройдений повністю.
            </Alert>
          )}
        </>
      )}
    </Screen>
  );
}
