import { connection } from "next/server";
import { Alert, Card, Label, Screen } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleNav } from "@/components/role-nav";
import {
  formatWebinarDateTime,
  formatWhen,
  splitFeed,
  type WebinarRow,
} from "@/lib/webinars";
import { openWebinar } from "./actions";

export const instant = false;

export const metadata = { title: "Вебінари · Вражаючий сервіс" };

/** The button that both counts the touch and opens the link. */
function OpenButton({
  webinarId,
  source,
  label,
  tone,
}: {
  webinarId: string;
  source: "live" | "recording";
  label: string;
  tone: "accent" | "neutral";
}) {
  return (
    <form action={openWebinar}>
      <input type="hidden" name="webinar_id" value={webinarId} />
      <input type="hidden" name="source" value={source} />
      <button
        type="submit"
        className={
          "tap inline-flex w-full items-center justify-center rounded-[var(--radius-md)] px-[var(--space-4)] font-[var(--weight-semibold)] sm:w-auto " +
          (tone === "accent"
            ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]"
            : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface)]")
        }
      >
        {label}
      </button>
    </form>
  );
}

function Upcoming({ row }: { row: WebinarRow }) {
  return (
    <Card className="border-[var(--color-accent)]">
      <Label>{formatWhen(row.starts_at)}</Label>
      <h2 className="mt-[var(--space-2)] text-[length:var(--text-h2)] font-[var(--weight-bold)]">
        {row.title}
      </h2>
      <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        {formatWebinarDateTime(row.starts_at)} · {row.duration_min} хв
      </p>
      {row.description && (
        <p className="mt-[var(--space-3)] text-[var(--color-text-secondary)]">
          {row.description}
        </p>
      )}

      <div className="mt-[var(--space-6)]">
        {row.join_url ? (
          <OpenButton
            webinarId={row.webinar_id}
            source="live"
            label={row.joined_live ? "Відкрити ефір ще раз" : "Приєднатись"}
            tone="accent"
          />
        ) : (
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Посилання з&apos;явиться тут ближче до ефіру.
          </p>
        )}
      </div>
    </Card>
  );
}

function Past({ row }: { row: WebinarRow }) {
  return (
    <li className="border-b border-[var(--color-border)] py-[var(--space-4)] last:border-0">
      <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-[var(--weight-semibold)]">{row.title}</h3>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            {formatWebinarDateTime(row.starts_at)}
            {row.opened_recording && " · переглянуто"}
          </p>
        </div>

        <div className="shrink-0">
          {row.recording_url ? (
            <OpenButton
              webinarId={row.webinar_id}
              source="recording"
              label={row.opened_recording ? "Відкрити ще раз" : "Дивитись запис"}
              tone="neutral"
            />
          ) : (
            <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              запис готується
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export default async function WebinarsPage({
  searchParams,
}: PageProps<"/learn/webinars">) {
  await connection();

  const params = await searchParams;
  const user = await requireActiveUser();
  const supabase = await createClient();

  const [{ data: overview }, { data: rows }] = await Promise.all([
    supabase.rpc("org_overview"),
    supabase.rpc("webinar_feed"),
  ]);

  const org = overview?.[0];
  const expired =
    org?.expires_at != null && new Date(org.expires_at) < new Date();
  const { upcoming, past } = splitFeed(rows ?? []);
  const next = upcoming[0];
  const later = upcoming.slice(1);

  return (
    <Screen>
      <RoleNav role={user.role} current="learn" orgName={org?.name} />

      <div className="mb-[var(--space-6)]">
        <Label>Вебінари</Label>
        <h1 className="mt-[var(--space-1)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
          Щомісяця — одна тема
        </h1>
        <p className="mt-[var(--space-2)] text-[var(--color-text-secondary)]">
          Не вийшло потрапити на ефір — запис зʼявляється тут наступного дня.
          Він зараховується так само, як жива участь.
        </p>
      </div>

      {params.error && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="warning">
            Посилання зараз недоступне. Можливо, ефір уже завершився — запис
            буде в архіві нижче.
          </Alert>
        </div>
      )}

      {expired && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="danger">
            Доступ закладу закінчився, тому розклад і записи приховані.
            Звернись до управляючого, щоб продовжити.
          </Alert>
        </div>
      )}

      {next ? (
        <div className="mb-[var(--space-6)]">
          <Upcoming row={next} />
        </div>
      ) : (
        !expired && (
          <Card className="mb-[var(--space-6)]">
            <h2 className="text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
              Дата наступного ефіру зʼявиться тут
            </h2>
            <p className="mt-[var(--space-2)] text-[var(--color-text-secondary)]">
              Вебінари виходять раз на місяць. Поки нового в розкладі немає —
              подивись записи попередніх.
            </p>
          </Card>
        )
      )}

      {later.length > 0 && (
        <div className="mb-[var(--space-6)]">
          <Label>Далі в розкладі</Label>
          <ul className="mt-[var(--space-2)]">
            {later.map((row) => (
              <li
                key={row.webinar_id}
                className="flex min-h-[var(--tap-min)] items-center justify-between gap-[var(--space-4)] border-b border-[var(--color-border)] py-[var(--space-3)] last:border-0"
              >
                <span className="min-w-0 truncate">{row.title}</span>
                <span className="shrink-0 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                  {formatWhen(row.starts_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <Card>
          <Label>Архів записів</Label>
          <ul className="mt-[var(--space-2)]">
            {past.map((row) => (
              <Past key={row.webinar_id} row={row} />
            ))}
          </ul>
        </Card>
      )}
    </Screen>
  );
}
