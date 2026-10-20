import Link from "next/link";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth";

export const metadata = { title: "Платформа · Вражаючий сервіс" };

const TABS = [
  { href: "/su", label: "Огляд" },
  { href: "/su/orgs", label: "Заклади" },
  { href: "/su/course", label: "Курс" },
  { href: "/su/quizzes", label: "Тести" },
] as const;

/**
 * Guarding in the layout means every page under /su is covered whether or
 * not its author remembered to call the guard. Each page still fetches
 * through superadmin-only RPCs, so this is the second lock, not the only
 * one.
 */
export default async function SuLayout({
  children,
}: LayoutProps<"/su">) {
  await connection();
  await requireSuperadmin();

  return (
    <div className="mx-auto w-full max-w-[72rem] px-[var(--space-4)] py-[var(--space-6)]">
      <header className="mb-[var(--space-6)] flex flex-wrap items-center justify-between gap-[var(--space-4)]">
        <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
          Платформа
        </span>
        <nav className="flex flex-wrap gap-[var(--space-1)]">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="tap flex min-h-[var(--tap-min)] items-center rounded-[var(--radius-full)] px-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            >
              {t.label}
            </Link>
          ))}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="min-h-[var(--tap-min)] px-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)] underline"
            >
              Вийти
            </button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
