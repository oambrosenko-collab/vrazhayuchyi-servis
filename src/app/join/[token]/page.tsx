import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Alert, Card, Label, Screen } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ClaimSeatForm, RequestLinkForm } from "./forms";

// Per-visitor from the first byte: the page branches on whether the
// visitor is signed in, so there is no static shell worth prerendering.
export const instant = false;

export const metadata = { title: "Приєднання · Вражаючий сервіс" };

/** Reasons `lookup_invite` can refuse, each one a designed screen. */
const BLOCKED: Record<string, { title: string; body: string }> = {
  invalid_link: {
    title: "Посилання недійсне",
    body: "Можливо, управляючий створив нове. Попроси надіслати актуальне посилання.",
  },
  expired: {
    title: "Доступ закладу закінчився",
    body: "Термін навчання для цього закладу минув. Звернись до управляючого — він продовжить доступ.",
  },
  suspended: {
    title: "Доступ призупинено",
    body: "Навчання для цього закладу тимчасово зупинене. Звернись до управляючого.",
  },
  no_seats: {
    title: "Місця закінчились",
    body: "Усі місця пакета зайняті. Управляючий може звільнити місце того, хто вже не працює, — і ти зайдеш за цим самим посиланням.",
  },
};

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  // The Supabase auth client reads the clock to check token expiry, which
  // a prerender pass cannot do. This route is per-visitor anyway.
  await connection();

  const { token } = await params;
  const supabase = await createClient();

  const [{ data: invite }, { data: auth }] = await Promise.all([
    supabase.rpc("lookup_invite", { p_token: token }),
    supabase.auth.getUser(),
  ]);

  const row = invite?.[0];
  const user = auth.user;

  if (!row || !row.out_valid) {
    const screen = BLOCKED[row?.out_reason ?? "invalid_link"] ?? BLOCKED.invalid_link;
    return (
      <Screen>
        <Card>
          <h1 className="mb-[var(--space-3)] text-[length:var(--text-h2)] font-[var(--weight-bold)]">
            {screen.title}
          </h1>
          <p className="text-[var(--color-text-secondary)]">{screen.body}</p>
          {row?.out_org_name && (
            <p className="mt-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Заклад: {row.out_org_name}
            </p>
          )}
        </Card>
        <p className="mt-[var(--space-6)] text-center text-[length:var(--text-sm)]">
          <Link
            href="/login"
            className="text-[var(--color-text-secondary)] underline"
          >
            Уже маєш акаунт? Увійти
          </Link>
        </p>
      </Screen>
    );
  }

  // Already an active member of this restaurant — no reason to re-run the flow.
  if (user) {
    const { data: existing } = await supabase
      .from("users")
      .select("status, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existing?.status === "active") {
      redirect(existing.role === "employee" ? "/learn" : "/admin");
    }
  }

  const seatsLeft = row.out_seats_total - row.out_seats_taken;

  return (
    <Screen>
      <Label>Запрошення до навчання</Label>
      <h1 className="mt-[var(--space-2)] mb-[var(--space-2)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        {row.out_org_name}
      </h1>
      <p className="mb-[var(--space-6)] text-[var(--color-text-secondary)]">
        Курс сервісу в залі. Уроки по 5 хвилин, проходиш із телефона.
      </p>

      {seatsLeft <= Math.max(1, Math.ceil(row.out_seats_total * 0.2)) && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="warning">
            Лишилось {seatsLeft} з {row.out_seats_total} місць.
          </Alert>
        </div>
      )}

      <Card>
        {user ? (
          <ClaimSeatForm token={token} email={user.email ?? ""} />
        ) : (
          <RequestLinkForm token={token} />
        )}
      </Card>
    </Screen>
  );
}
