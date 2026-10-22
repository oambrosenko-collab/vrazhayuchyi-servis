import { connection } from "next/server";
import Link from "next/link";
import { Alert, Card, Label, Screen } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildOutline, formatDuration } from "@/lib/course";
import { RoleNav } from "@/components/role-nav";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Навчання · Вражаючий сервіс" };

/**
 * A quiz sitting under its module's lessons.
 *
 * Locked until the module is watched — not to police anyone, but because
 * a test taken before the lessons teaches nothing and the score would
 * mislead the owner's report.
 */
function QuizRow({
  href,
  title,
  passed,
  bestScore,
  attempts,
  locked,
  lockedHint,
}: {
  href: string;
  title: string;
  passed: boolean;
  bestScore: number;
  attempts: number;
  locked: boolean;
  lockedHint: string;
}) {
  const status = passed
    ? `складено · ${bestScore}%`
    : attempts > 0
      ? `найкращий ${bestScore}%`
      : locked
        ? lockedHint
        : "не складено";

  const body = (
    <>
      <span
        aria-hidden
        className={
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-full)] text-[length:var(--text-xs)] " +
          (passed
            ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
            : "border border-[var(--color-border-strong)] text-[var(--color-text-muted)]")
        }
      >
        {passed ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <span
        className={
          "shrink-0 whitespace-nowrap text-[length:var(--text-sm)] " +
          (passed
            ? "text-[var(--color-success)]"
            : "text-[var(--color-text-secondary)]")
        }
      >
        {status}
      </span>
    </>
  );

  const shell =
    "mt-[var(--space-3)] flex min-h-[var(--tap-min)] items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)]";

  if (locked) {
    return (
      <div className={`${shell} text-[var(--color-text-muted)]`}>{body}</div>
    );
  }

  return (
    <Link href={href} className={`tap ${shell} bg-[var(--color-surface-raised)]`}>
      {body}
    </Link>
  );
}

export default async function LearnPage() {
  // Reads the session cookie and the clock (token expiry, access dates),
  // neither of which a prerender pass can resolve.
  await connection();

  const user = await requireActiveUser();
  const supabase = await createClient();

  const [
    { data: overview },
    { data: rows },
    { data: quizRows },
    { data: certRows },
  ] = await Promise.all([
    supabase.rpc("org_overview"),
    supabase.rpc("course_outline"),
    supabase.rpc("course_quizzes"),
    supabase.rpc("certificate_status"),
  ]);

  const org = overview?.[0];
  const outline = buildOutline(rows ?? []);
  const quizzes = quizRows ?? [];
  const cert = certRows?.[0];

  const quizByModule = new Map(
    quizzes
      .filter((q) => q.module_id)
      .map((q) => [q.module_id as string, q] as const),
  );
  const finalQuiz = quizzes.find((q) => q.is_final) ?? null;

  const expired =
    org?.expires_at != null && new Date(org.expires_at) < new Date();
  const percent =
    outline.total > 0 ? Math.round((outline.done / outline.total) * 100) : 0;

  // Finished everything? Send them back to the start rather than nowhere.
  const target = outline.next ?? outline.lessons[0] ?? null;

  return (
    <Screen>
      <RoleNav role={user.role} current="learn" orgName={org?.name} />

      <div className="mb-[var(--space-6)]">
        {org?.name && <Label>{org.name}</Label>}
        <h1 className="mt-[var(--space-1)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
          Привіт, {user.full_name.split(" ")[0]}
        </h1>
      </div>

      {expired && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="danger">
            Доступ закладу закінчився, тому уроки зараз недоступні. Прогрес і
            сертифікати збережені — звернись до управляючого, щоб продовжити.
          </Alert>
        </div>
      )}

      {!target ? (
        <Card>
          <h2 className="mb-[var(--space-2)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
            {expired ? "Уроки приховані" : "Курс ще готується"}
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            {expired
              ? "Щойно доступ продовжать, усе повернеться на місце — з того уроку, де ти спинився."
              : "Уроки з'являться тут, щойно буде записаний перший модуль. Місце за тобою вже закріплене."}
          </p>
        </Card>
      ) : (
        <>
          {/* The one big action. Everything else on this screen is a list. */}
          <Link
            href={`/learn/${target.id}`}
            className="tap mb-[var(--space-6)] flex min-h-[4rem] flex-col justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-[var(--space-6)] py-[var(--space-4)] text-[var(--color-text-on-accent)]"
          >
            <span className="text-[length:var(--text-h2)] font-[var(--weight-bold)]">
              {outline.done === 0
                ? "Почати навчання"
                : outline.next
                  ? "Продовжити"
                  : "Переглянути ще раз"}
            </span>
            <span className="text-[length:var(--text-sm)] opacity-80">
              {target.title}
            </span>
          </Link>

          <div className="mb-[var(--space-6)]">
            <div className="mb-[var(--space-2)] flex items-baseline justify-between">
              <Label>Прогрес</Label>
              <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                {outline.done} із {outline.total} уроків
              </span>
            </div>
            <div className="h-[8px] w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface)]">
              <div
                className="h-full bg-[var(--color-success)] transition-[width] duration-[var(--duration-base)]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[var(--space-4)]">
            {outline.modules.map((mod, i) => {
              const quiz = quizByModule.get(mod.id);
              return (
                <Card key={mod.id}>
                  <Label>Модуль {i + 1}</Label>
                  <h2 className="mt-[var(--space-1)] mb-[var(--space-4)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
                    {mod.title}
                  </h2>

                  <ul className="flex flex-col">
                    {mod.lessons.map((l) => (
                      <li
                        key={l.id}
                        className="border-b border-[var(--color-border)] last:border-0"
                      >
                        <Link
                          href={`/learn/${l.id}`}
                          className="tap flex min-h-[var(--tap-min)] items-center gap-[var(--space-3)] py-[var(--space-3)]"
                        >
                          <span
                            aria-hidden
                            className={
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-full)] text-[length:var(--text-xs)] " +
                              (l.completed
                                ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                                : "border border-[var(--color-border-strong)] text-[var(--color-text-muted)]")
                            }
                          >
                            {l.completed ? "✓" : ""}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {l.title}
                          </span>
                          <span className="shrink-0 font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                            {formatDuration(l.durationSec)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {quiz && (
                    <QuizRow
                      href={`/learn/quiz/${quiz.quiz_id}`}
                      title="Тест модуля"
                      passed={quiz.passed}
                      bestScore={quiz.best_score}
                      attempts={quiz.attempts}
                      locked={!mod.lessons.every((l) => l.completed)}
                      lockedHint="спочатку уроки"
                    />
                  )}
                </Card>
              );
            })}

            {finalQuiz && (
              <Card>
                <Label>Фінал</Label>
                <h2 className="mt-[var(--space-1)] mb-[var(--space-2)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
                  {finalQuiz.title}
                </h2>
                <QuizRow
                  href={`/learn/quiz/${finalQuiz.quiz_id}`}
                  title="Фінальний тест"
                  passed={finalQuiz.passed}
                  bestScore={finalQuiz.best_score}
                  attempts={finalQuiz.attempts}
                  locked={outline.done < outline.total}
                  lockedHint="спочатку уроки"
                />
              </Card>
            )}

            {cert && (
              <Link
                href="/learn/certificate"
                className={
                  "tap flex min-h-[var(--tap-min)] items-center justify-between gap-[var(--space-4)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--weight-semibold)] " +
                  (cert.number
                    ? "border border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]")
                }
              >
                <span>Сертифікат</span>
                <span className="text-[length:var(--text-sm)] font-[var(--weight-regular)] opacity-80">
                  {cert.number
                    ? cert.number
                    : cert.eligible
                      ? "можна отримати"
                      : `тестів ${cert.quizzes_passed} з ${cert.quizzes_total}`}
                </span>
              </Link>
            )}
          </div>
        </>
      )}
    </Screen>
  );
}
