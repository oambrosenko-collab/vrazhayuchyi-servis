import { connection } from "next/server";
import { Alert, Card, Label, Screen } from "@/components/ui";
import { requireOrgAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { InvitePanel } from "./invite-panel";
import { TeamTable } from "./team-table";

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
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default async function AdminPage() {
  // Reads the session cookie and the clock (token expiry, access dates),
  // neither of which a prerender pass can resolve.
  await connection();

  const admin = await requireOrgAdmin();
  const supabase = await createClient();

  const [{ data: overviewRows }, { data: team }] = await Promise.all([
    supabase.rpc("org_overview"),
    supabase
      .from("users")
      .select("id, full_name, email, role, status, joined_at, removed_at")
      .order("status", { ascending: true })
      .order("joined_at", { ascending: true }),
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

  const left = daysLeft(org.expires_at);
  const inviteUrl = org.invite_token
    ? `${env.NEXT_PUBLIC_SITE_URL}/join/${org.invite_token}`
    : null;

  return (
    <Screen width="wide">
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

      <div className="mb-[var(--space-6)] grid gap-[var(--space-4)] sm:grid-cols-3">
        <Card>
          <Label>Місць зайнято</Label>
          <p className="mt-[var(--space-2)] text-[length:var(--text-display)] font-[var(--weight-bold)]">
            {org.seats_taken}
            <span className="text-[length:var(--text-h2)] text-[var(--color-text-secondary)]">
              {" "}
              із {org.package_size}
            </span>
          </p>
        </Card>
        <Card>
          <Label>Вільних місць</Label>
          <p className="mt-[var(--space-2)] text-[length:var(--text-display)] font-[var(--weight-bold)]">
            {org.seats_left}
          </p>
        </Card>
        <Card>
          <Label>Доступ до</Label>
          <p className="mt-[var(--space-2)] text-[length:var(--text-h2)] font-[var(--weight-semibold)]">
            {formatDate(org.expires_at)}
          </p>
        </Card>
      </div>

      {inviteUrl && (
        <div className="mb-[var(--space-6)]">
          <InvitePanel url={inviteUrl} seatsLeft={org.seats_left} />
        </div>
      )}

      <TeamTable rows={team ?? []} currentUserId={admin.id} />

      {org.cumulative_users > org.cumulative_limit * 0.8 && (
        <div className="mt-[var(--space-4)]">
          <Alert tone="warning">
            За весь період через пакет пройшло {org.cumulative_users} осіб із{" "}
            {org.cumulative_limit} допустимих.
          </Alert>
        </div>
      )}

      <form action="/auth/sign-out" method="post" className="mt-[var(--space-8)]">
        <button
          type="submit"
          className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
        >
          Вийти
        </button>
      </form>
    </Screen>
  );
}
