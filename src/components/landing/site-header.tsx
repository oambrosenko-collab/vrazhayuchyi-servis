import Link from "next/link";

const LINKS = [
  { href: "#year", label: "Річний доступ" },
  { href: "#how", label: "Порядок роботи" },
  { href: "#pricing", label: "Ціни" },
  { href: "#faq", label: "Запитання" },
];

/**
 * Sticky, because the pricing and the request form both live far down the
 * page and the whole point of the landing is that the way to them is never
 * more than one tap away.
 *
 * The nav links hide below `md`: four items plus two buttons do not fit
 * across 375px, and the page is short enough to scroll.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--color-border)] bg-[var(--color-bg-deep)]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-2)]">
        <Link
          href="/"
          className="tap flex items-center font-[var(--weight-bold)] [font-family:var(--font-display)]"
        >
          Вражаючий сервіс
        </Link>

        <nav className="hidden items-center gap-[var(--space-6)] md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="tap flex items-center text-[length:var(--text-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-[var(--space-2)]">
          <Link
            href="/login"
            className="tap flex items-center text-[length:var(--text-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            Увійти
          </Link>
          {/* The only accent in the header — the request form is the one
              action this page is for. */}
          <a
            href="#request"
            className="tap hidden items-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-4)] font-[var(--weight-semibold)] text-[length:var(--text-sm)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)] sm:flex"
          >
            Отримати рахунок
          </a>
        </div>
      </div>
    </header>
  );
}
