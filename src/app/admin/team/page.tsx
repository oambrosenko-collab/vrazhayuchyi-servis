import Link from "next/link";
import { connection } from "next/server";
import { Alert, Label, Screen } from "@/components/ui";
import { requireOrgAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TeamTable } from "./team-table";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Команда · Вражаючий сервіс" };

export default async function TeamPage() {
  // Reads the session cookie and the clock (token expiry, access dates),
  // neither of which a prerender pass can resolve.
  await connection();

  const admin = await requireOrgAdmin();
  const supabase = await createClient();

  const [{ data: overviewRows }, { data: rows }] = await Promise.all([
    supabase.rpc("org_overview"),
    supabase.rpc("team_report"),
  ]);

  const org = overviewRows?.[0];

  return (
    <Screen width="wide">
      <Link
        href="/admin"
        className="mb-[var(--space-4)] block w-fit text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
      >
        ← До кабінету
      </Link>

      <Label>{org?.name ?? "Заклад"}</Label>
      <h1 className="mt-[var(--space-1)] mb-[var(--space-6)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        Команда
      </h1>

      {!rows || rows.length === 0 ? (
        <Alert tone="info">
          Поки нікого. Скопіюй посилання в кабінеті й кинь його в робочий чат.
        </Alert>
      ) : (
        <TeamTable rows={rows} currentUserId={admin.id} />
      )}
    </Screen>
  );
}
