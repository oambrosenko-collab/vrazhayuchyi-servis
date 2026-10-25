import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, Label, Screen } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

// Per-visitor from the first byte: the page branches on sign-in state
// and redirects most visitors straight through, so there is no static
// shell worth prerendering.
export const instant = false;

export const metadata = { title: "Демодоступ · Вражаючий сервіс" };

/** Where an already-active account belongs — a repeat visit skips straight in. */
const HOME: Record<string, string> = {
  viewer: "/su",
  superadmin: "/su",
  org_admin: "/admin",
  employee: "/learn",
};

export default async function ViewPage({
  params,
  searchParams,
}: PageProps<"/view/[token]">) {
  await connection();

  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: lookup }, { data: auth }] = await Promise.all([
    supabase.rpc("lookup_view_invite", { p_token: token }),
    supabase.auth.getUser(),
  ]);

  const valid = lookup?.[0]?.out_valid ?? false;
  const user = auth.user;

  if (!valid) {
    return (
      <Screen>
        <Card>
          <h1 className="mb-[var(--space-3)] text-[length:var(--text-h2)] font-[var(--weight-bold)]">
            Посилання недійсне
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Попроси актуальне посилання в того, хто його надіслав.
          </p>
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

  // Already signed in as the viewer (or any other active account) from
  // an earlier visit — go straight in, no need to sign in again.
  if (user) {
    const { data: existing } = await supabase
      .from("users")
      .select("status, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existing?.status === "active") {
      redirect(HOME[existing.role] ?? "/su");
    }
  }

  // Not signed in yet: /enter does the actual work (no email, no form —
  // see its own comment for why) and redirects onward from there.
  if (!error) {
    redirect(`/view/${token}/enter`);
  }

  return (
    <Screen>
      <Label>Демодоступ</Label>
      <h1 className="mt-[var(--space-2)] mb-[var(--space-2)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        Вражаючий сервіс
      </h1>
      <Card>
        <p className="text-[var(--color-text-secondary)]">
          Не вдалося відкрити демодоступ. Спробуй ще раз за хвилину.
        </p>
      </Card>
    </Screen>
  );
}
