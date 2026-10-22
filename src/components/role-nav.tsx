import Link from "next/link";
import type { Enums } from "@/lib/supabase/types";

type Role = Enums<"user_role">;
export type NavArea = "learn" | "admin" | "su";

/**
 * The only way between the three areas.
 *
 * Before this existed, a superadmin signed in, landed on /learn, and had
 * no path to /su at all — the area was reachable only by typing the URL.
 * /admin was a dead end in the same way.
 *
 * Each role sees only what it actually has, so this doubles as an honest
 * statement of what the account is: a waiter sees one item and that is
 * the whole truth of their account.
 */
const AREAS: { key: NavArea; href: string; label: string; roles: Role[] }[] = [
  {
    key: "learn",
    href: "/learn",
    label: "Навчання",
    roles: ["employee", "org_admin", "superadmin"],
  },
  {
    key: "admin",
    href: "/admin",
    label: "Кабінет",
    roles: ["org_admin", "superadmin"],
  },
  {
    key: "su",
    href: "/su",
    label: "Платформа",
    roles: ["superadmin"],
  },
];

export function RoleNav({
  role,
  current,
  orgName,
}: {
  role: Role;
  current: NavArea;
  /** Shown only where there is one — the platform area belongs to nobody. */
  orgName?: string | null;
}) {
  const areas = AREAS.filter((a) => a.roles.includes(role));

  return (
    <header className="mb-[var(--space-6)] flex items-center justify-between gap-[var(--space-2)] border-b border-[var(--color-border)] pb-[var(--space-2)]">
      {/* Scrolls rather than wraps: three tabs plus sign-out do not fit
          across 375px, and wrapping pushed the waiter content down by two
          whole rows. */}
      <nav className="-mx-[var(--space-1)] flex min-w-0 flex-nowrap items-center gap-[var(--space-1)] overflow-x-auto px-[var(--space-1)]">
        {/* A waiter has exactly one area, so naming it would be noise;
            their restaurant is already the page heading. */}
        {areas.length > 1 &&
          areas.map((a) => {
            const active = a.key === current;
            return (
              <Link
                key={a.key}
                href={a.href}
                aria-current={active ? "page" : undefined}
                className={
                  "tap flex min-h-[var(--tap-min)] shrink-0 items-center whitespace-nowrap rounded-[var(--radius-full)] px-[var(--space-3)] text-[length:var(--text-sm)] " +
                  (active
                    ? "bg-[var(--color-surface-raised)] font-[var(--weight-semibold)] text-[var(--color-text)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]")
                }
              >
                {a.label}
              </Link>
            );
          })}
        {areas.length <= 1 && orgName && (
          <span className="whitespace-nowrap px-[var(--space-2)] text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
            {orgName}
          </span>
        )}
      </nav>

      <form action="/auth/sign-out" method="post" className="shrink-0">
        <button
          type="submit"
          className="min-h-[var(--tap-min)] px-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)] underline"
        >
          Вийти
        </button>
      </form>
    </header>
  );
}
