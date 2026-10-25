import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, Label, Screen } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ClaimViewForm, RequestViewLinkForm } from "./forms";

// Per-visitor from the first byte, same reasoning as /join/[token]: the
// page branches on sign-in state, so there is no static shell to prerender.
export const instant = false;

export const metadata = { title: "Демодоступ · Вражаючий сервіс" };

/** Where an already-active account belongs — a repeat visit skips the form. */
const HOME: Record<string, string> = {
  viewer: "/su",
  superadmin: "/su",
  org_admin: "/admin",
  employee: "/learn",
};

export default async function ViewPage({
  params,
}: PageProps<"/view/[token]">) {
  // lookup_view_invite reads nothing clock-sensitive today, but the auth
  // client does (session expiry), and this route is per-visitor anyway.
  await connection();

  const { token } = await params;
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

  // Already claimed — a repeat open of the same link should land straight
  // in the app, not ask for a name again.
  if (user) {
    const { data: existing } = await supabase
      .from("users")
      .select("status, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existing?.status === "active") {
      redirect(HOME[existing.role] ?? "/learn");
    }
  }

  return (
    <Screen>
      <Label>Демодоступ</Label>
      <h1 className="mt-[var(--space-2)] mb-[var(--space-2)] text-[length:var(--text-h1)] font-[var(--weight-bold)]">
        Вражаючий сервіс
      </h1>
      <p className="mb-[var(--space-6)] text-[var(--color-text-secondary)]">
        Перегляд усіх трьох областей платформи — навчання, кабінет закладу,
        адмінка власника — без можливості щось змінити.
      </p>

      <Card>
        {user ? (
          <ClaimViewForm token={token} email={user.email ?? ""} />
        ) : (
          <RequestViewLinkForm token={token} />
        )}
      </Card>
    </Screen>
  );
}
