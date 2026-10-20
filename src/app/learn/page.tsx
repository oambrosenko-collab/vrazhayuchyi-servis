import { connection } from "next/server";
import Link from "next/link";
import { Alert, Button, Card, Label, Screen } from "@/components/ui";
import { requireActiveUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Навчання · Вражаючий сервіс" };

export default async function LearnPage() {
  // Reads the session cookie and the clock (token expiry, access dates),
  // neither of which a prerender pass can resolve.
  await connection();

  const user = await requireActiveUser();

  const supabase = await createClient();
  const { data } = await supabase.rpc("org_overview");
  const org = data?.[0];

  const expired =
    org?.expires_at != null && new Date(org.expires_at) < new Date();

  return (
    <Screen>
      <div className="mb-[var(--space-6)] flex items-start justify-between gap-[var(--space-4)]">
        <div>
          <Label>{org?.name ?? "Заклад"}</Label>
          <h1 className="mt-[var(--space-1)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
            Привіт, {user.full_name.split(" ")[0]}
          </h1>
        </div>
        {(user.role === "org_admin" || user.role === "superadmin") && (
          <Link href="/admin" className="tap shrink-0">
            <Button variant="ghost">Кабінет</Button>
          </Link>
        )}
      </div>

      {expired && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="danger">
            Доступ закладу закінчився. Прогрес і сертифікати збережені —
            звернись до управляючого, щоб продовжити.
          </Alert>
        </div>
      )}

      <Card>
        <h2 className="mb-[var(--space-2)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
          Курс ще готується
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Уроки з&apos;являться тут, щойно буде записаний перший модуль. Місце
          за тобою вже закріплене — повертайся за посиланням, яке дав
          управляючий.
        </p>
      </Card>

      <form action="/auth/sign-out" method="post" className="mt-[var(--space-8)]">
        <Button variant="ghost" type="submit">
          Вийти
        </Button>
      </form>
    </Screen>
  );
}
