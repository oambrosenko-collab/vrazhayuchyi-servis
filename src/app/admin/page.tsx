import Link from "next/link";
import { connection } from "next/server";
import { Alert, Card, Label, Screen } from "@/components/ui";
import { requireOrgAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { summarise, formatSince, STUCK_AFTER_DAYS } from "@/lib/team";
import { RoleNav } from "@/components/role-nav";
import { InvitePanel } from "./invite-panel";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Кабінет закладу · Вражаючий сервіс" };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warning" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
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

export default async function AdminPage() {
  // Reads the session cookie and the clock (token expiry, access dates),
  // neither of which a prerender pass can resolve.
  await connection();

  const admin = await requireOrgAdmin();
  const supabase = await createClient();

  const [{ data: overviewRows }, { data: teamRows }] = await Promise.all([
    supabase.rpc("org_overview"),
    supabase.rpc("team_report"),
  ]);

  const org = overviewRows?.[0];
  if (!org) {
    return (
      <Screen>
        <Alert tone="danger">
          Не вдалося завантажити дані закладу. Онови сторінку.
        </Alert>
      </Screen>
    );
  }

  const team = summarise(teamRows ?? []);
  const left = daysLeft(org.expires_at);
  const inviteUrl = org.invite_token
    ? `${env.NEXT_PUBLIC_SITE_URL}/join/${org.invite_token}`
    : null;

  // The number that predicts renewal: seats bought versus seats used.
  const activation =
    org.package_size > 0
      ? Math.round((org.seats_taken / org.package_size) * 100)
      : 0;

  return (
    <Screen width="wide">
      <RoleNav role={admin.role} current="admin" />

      <div className="mb-[var(--space-6)]">
        <Label>Кабінет закладу</Label>
        <h1 className="mt-[var(--space-1)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
          {org.name}
        </h1>
      </div>

      {left !== null && left <= 30 && left > 0 && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="warning">
            Доступ закінчується через {left} дн. — {formatDate(org.expires_at)}.
          </Alert>
        </div>
      )}
      {left !== null && left <= 0 && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="danger">
            Доступ закінчився {formatDate(org.expires_at)}. Команда більше не
            бачить уроків, звіти й сертифікати збережені.
          </Alert>
        </div>
      )}

      <div className="mb-[var(--space-6)] grid gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Місць зайнято"
          value={`${org.seats_taken} із ${org.package_size}`}
          hint={`активація ${activation}%`}
          tone={activation < 60 && org.seats_taken > 0 ? "warning" : undefined}
        />
        <Stat
          label="Середній прогрес"
          value={`${team.averagePercent}%`}
          // Impersonal on purpose: "N завершили" is wrong for one person,
          // and the gendered singular would need data we do not collect.
          hint={
            team.finished > 0
              ? `курс завершено: ${team.finished}`
              : "курс ще ніхто не завершив"
          }
        />
        <Stat
          label="Застрягли"
          value={String(team.stuck.length)}
          hint={`без активності ${STUCK_AFTER_DAYS} днів`}
          tone={team.stuck.length > 0 ? "warning" : undefined}
        />
        <Stat label="Доступ до" value={formatDate(org.expires_at)} />
      </div>

      {inviteUrl && (
        <div className="mb-[var(--space-6)]">
          <InvitePanel url={inviteUrl} seatsLeft={org.seats_left} />
        </div>
      )}

      {team.stuck.length > 0 && (
        <Card className="mb-[var(--space-6)]">
          <Label>Кому написати</Label>
          <p className="mt-[var(--space-2)] mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Ці люди не відкривали уроків понад тиждень. Одне повідомлення в
            робочий чат зазвичай вирішує.
          </p>
          <ul className="flex flex-col">
            {team.stuck.slice(0, 5).map((r) => (
              <li
                key={r.user_id}
                className="flex min-h-[var(--tap-min)] items-center justify-between gap-[var(--space-4)] border-b border-[var(--color-border)] py-[var(--space-2)] last:border-0"
              >
                <span className="min-w-0 truncate">{r.full_name}</span>
                <span className="shrink-0 text-[length:var(--text-sm)] text-[var(--color-warning)]">
                  {formatSince(r.last_seen_at)}
                </span>
              </li>
            ))}
          </ul>
          {team.stuck.length > 5 && (
            <p className="mt-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              …і ще {team.stuck.length - 5}
            </p>
          )}
        </Card>
      )}

      <Link
        href="/admin/team"
        className="tap flex min-h-[var(--tap-min)] items-center justify-between gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--weight-semibold)]"
      >
        <span>Команда й прогрес</span>
        <span className="text-[length:var(--text-sm)] font-[var(--weight-regular)] text-[var(--color-text-secondary)]">
          {team.active.length} активних
          {team.released.length > 0 && ` · ${team.released.length} в історії`}
        </span>
      </Link>

      {org.cumulative_users > org.cumulative_limit * 0.8 && (
        <div className="mt-[var(--space-4)]">
          <Alert tone="warning">
            За весь період через пакет пройшло {org.cumulative_users} осіб із{" "}
            {org.cumulative_limit} допустимих.
          </Alert>
        </div>
      )}
    </Screen>
  );
}
