import Image from "next/image";
import Link from "next/link";

/**
 * Line-art banner, recoloured from its original black-on-white source into
 * the system's periwinkle and flattened to a transparent background, then
 * cropped to the figures' own bounding box — see
 * `public/images/footer-waiters-v2.png`. The crop is what lets it sit flush
 * against the footer's bottom edge: the source file had ~90px of empty
 * canvas under the feet. Decorative only: the scene repeats what the hero
 * photo already says, so it carries no alt text.
 *
 * `-v2`: the file was edited in place under its original name several
 * times in one session (recolour, then two crops), and Next's image
 * optimiser kept serving an old cached resize at the old aspect ratio
 * under that URL even after the file changed. Renaming it is what
 * actually busts that — a query-string cache-buster on the same path
 * did not.
 */
const ILLUSTRATION = "/images/footer-waiters-v2.png";

export function SiteFooter() {
  return (
    <footer className="flex flex-col bg-[var(--color-bg)]">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-[var(--space-4)] px-[var(--space-4)] pt-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
        <nav className="order-2 flex gap-[var(--space-6)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)] sm:order-1">
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
        <span className="order-1 text-[length:var(--text-sm)] text-[var(--color-text-secondary)] sm:order-2">
          ©2026 Вражаючий сервіс
        </span>
      </div>

      {/* Same `mx-auto max-w-[96rem]` wrapper as the nav row above, so the
          heading's left edge lines up with «Ціни / Заявка / Увійти» rather
          than with the raw viewport edge. The heading grows to fill
          whatever width the illustration leaves it — `flex-1` rather than
          a fixed size.
          The two lines are separate spans with their own `leading-[1]`
          rather than a shrunk line-height on the whole block: a line-height
          under 1 shrinks each line's box toward its own glyphs and would
          have clipped the descender on «р» — the lowest ink in «Вражаючий
          сервіс», and the thing that has to line up with the illustration.
          The gap between the lines is pulled in with a negative
          `margin-top` on the second span instead, which doesn't touch
          either line's own box.
          The picture's `md:w` is the exact formula `RequestForm` uses for
          its own two-column split (`grid-cols-2` with a `space-16` gap) —
          matched on purpose, so the illustration reads as wide as the
          request form above it. Height follows from that width via
          `h-auto`, at the source's own aspect ratio.
          `items-end` puts the picture's own bottom edge flush on the same
          line as the heading's — no extra offset past that: the image's
          bottom IS the line both sit on. */}
      <div className="mx-auto mt-[var(--space-2)] flex w-full max-w-[96rem] flex-col items-end gap-[var(--space-4)] px-[var(--space-4)] pb-[var(--space-8)] md:flex-row md:items-end md:justify-between">
        <h2 className="flex w-full flex-1 flex-col text-[length:clamp(2.25rem,6vw,4.5rem)] font-[var(--weight-bold)] opacity-60">
          <span className="leading-[1]">Вражаючий</span>
          <span className="-mt-[0.18em] leading-[1]">сервіс</span>
        </h2>

        <Image
          src={ILLUSTRATION}
          alt=""
          aria-hidden
          width={1200}
          height={584}
          className="h-auto w-full shrink-0 md:w-[calc((100%-var(--space-16))/2)]"
        />
      </div>
    </footer>
  );
}
