import Link from "next/link";
import { connection } from "next/server";
import { Alert, Card, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Огляд · Платформа" };

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warning" | "success";
}) {
  const color =
    tone === "warning"
      ? "text-[var(--color-warning)]"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : "text-[var(--color-text)]";
  return (
    <Card>
      <Label>{label}</Label>
      <p
        className={`mt-[var(--space-2)] text-[length:var(--text-display)] font-[var(--weight-bold)] ${color}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          {hint}
        </p>
      )}
    </Card>
  );
}

export default async function SuDashboard() {
  await connection();
  const supabase = await createClient();

  const { data } = await supabase.rpc("su_overview");
  const o = data?.[0];

  if (!o) {
    return <Alert tone="danger">Не вдалося завантажити зведення.</Alert>;
  }

  const activation =
    o.seats_sold > 0 ? Math.round((o.seats_taken / o.seats_sold) * 100) : 0;

  return (
    <>
      <h1 className="mb-[var(--space-6)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        Огляд платформи
      </h1>

      <div className="mb-[var(--space-6)] grid gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Заклади"
          value={String(o.organizations_total)}
          hint={`${o.organizations_active} з діючим доступом`}
        />
        <Stat
          label="Активація місць"
          value={`${activation}%`}
          hint={`${o.seats_taken} зайнято з ${o.seats_sold} проданих`}
          // Below 60% across the platform is the early warning that
          // renewals will not come — the PRD calls this the main metric.
          tone={activation < 60 && o.seats_taken > 0 ? "warning" : undefined}
        />
        <Stat
          label="Активні учні"
          value={String(o.learners_active)}
          hint={`середній прогрес ${o.avg_percent}%`}
        />
        <Stat
          label="Завершили курс"
          value={String(o.learners_finished)}
          hint={`сертифікатів видано: ${o.certificates_issued}`}
          tone={o.learners_finished > 0 ? "success" : undefined}
        />
      </div>

      <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
        <Link
          href="/su/course"
          className="tap flex min-h-[var(--tap-min)] items-center justify-between gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--weight-semibold)]"
        >
          <span>Курс</span>
          <span className="text-[length:var(--text-sm)] font-[var(--weight-regular)] text-[var(--color-text-secondary)]">
            {o.lessons_total} уроків
          </span>
        </Link>
        <Link
          href="/su/quizzes"
          className="tap flex min-h-[var(--tap-min)] items-center justify-between gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--weight-semibold)]"
        >
          <span>Тести</span>
          <span className="text-[length:var(--text-sm)] font-[var(--weight-regular)] text-[var(--color-text-secondary)]">
            {o.quizzes_total} шт.
          </span>
        </Link>
      </div>

      <Card className="mt-[var(--space-6)]">
        <Label>Чого тут поки немає</Label>
        <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Виручки й заявок на рахунки немає, бо немає таблиці замовлень —
          це крок «Оплата». Заливки відео немає, бо не підключений Bunny:
          поле для його id у формі уроку вже є. Вебінарів немає взагалі.
        </p>
      </Card>
    </>
  );
}
