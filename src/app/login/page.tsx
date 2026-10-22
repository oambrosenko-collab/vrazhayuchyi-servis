import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Alert, Card, Screen } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  link_invalid:
    "Посилання для входу застаріло або вже використане. Надішли новий лист.",
  no_membership:
    "Цей акаунт ще не приєднаний до закладу. Попроси управляючого надіслати посилання-інвайт.",
};

// Per-user and cookie-dependent: there is no static shell worth
// prerendering, so render on request instead of streaming a placeholder.
export const instant = false;

export const metadata = { title: "Вхід · Вражаючий сервіс" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  // Reads the session cookie and the clock (token expiry, access dates),
  // neither of which a prerender pass can resolve.
  await connection();

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawNext = typeof params.next === "string" ? params.next : "/learn";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/learn";

  // Already signed in and no error to show — skip the form.
  if (user && !params.error) redirect(next);

  const error = typeof params.error === "string" ? ERRORS[params.error] : null;

  return (
    <Screen>
      <h1 className="mb-[var(--space-2)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        Вхід
      </h1>
      <p className="mb-[var(--space-6)] text-[var(--color-text-secondary)]">
        Введи пошту — надішлемо посилання для входу. Пароль не потрібен.
      </p>

      {error && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="warning">{error}</Alert>
        </div>
      )}

      {/* A dead link does not mean a dead session. Clicking a stale letter
          lands here with an error, and the redirect above is deliberately
          skipped so the error is readable — which used to leave someone who
          was already signed in staring at a login form for no reason. */}
      {user && (
        <div className="mb-[var(--space-4)]">
          <Card>
            <p className="mb-[var(--space-4)] text-[var(--color-text-secondary)]">
              Хоча цей вхід уже виконано — ти в системі як{" "}
              <strong className="text-[var(--color-text)]">{user.email}</strong>
              . Новий лист потрібен, лише якщо хочеш зайти іншим акаунтом.
            </p>
            <Link
              href={next}
              className="tap inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-6)] font-[var(--weight-semibold)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]"
            >
              Продовжити
            </Link>
          </Card>
        </div>
      )}

      <Card>
        <LoginForm next={next} />
      </Card>
    </Screen>
  );
}
