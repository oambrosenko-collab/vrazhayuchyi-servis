import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-8)]">
      <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        {/* No year here on purpose: reading the clock while rendering
            forces this otherwise static page out of the prerender, and a
            footer year is not worth a dynamic render. */}
        <span>Вражаючий сервіс — навчання персоналу для ресторанів</span>
        <nav className="flex gap-[var(--space-6)]">
          <a
            href="#pricing"
            className="tap inline-flex items-center hover:text-[var(--color-text)]"
          >
            Ціни
          </a>
          <a
            href="#request"
            className="tap inline-flex items-center hover:text-[var(--color-text)]"
          >
            Заявка
          </a>
          <Link
            href="/login"
            className="tap inline-flex items-center hover:text-[var(--color-text)]"
          >
            Увійти
          </Link>
        </nav>
      </div>
    </footer>
  );
}
