import Image from "next/image";

/**
 * Broken into fixed lines rather than left to wrap.
 *
 * Natural wrapping splits the phrase wherever the column happens to end —
 * «СЕРВІС, ЗАРАДИ / ЯКОГО ГОСТІ / ПОВЕРТАЮТЬСЯ» cuts the sentence mid-
 * clause twice. These three carry one idea each, so each line can be read
 * on its own.
 */
const HEADLINE_LINES = ["Сервіс,", "заради якого", "гості повертаються"];

const PHOTO =
  "https://res.cloudinary.com/zb7a4nip/image/upload/v1792698028/%D0%9E%D1%84%D1%96%D1%86%D1%96%D0%B0%D0%BD%D1%82_%D0%BF%D0%BE%D0%B4%D0%B0%D1%94_%D0%B2%D0%B8%D1%88%D1%83%D0%BA%D0%B0%D0%BD%D1%83_%D1%81%D1%82%D1%80%D0%B0%D0%B2%D1%83.jpg";

/**
 * Full-bleed hero: the photograph is the first screen, the words sit on it.
 *
 * It does not use `Section` — that shell exists to hold content inside the
 * 72rem column, and this image has to reach both edges of the window. The
 * column comes back for the text alone, so the headline still lines up
 * with every section below it.
 *
 * Two scrims, each with a job. The horizontal one buys contrast for the
 * text: the photograph is bright, `--color-text-secondary` on it unscrimmed
 * is unreadable. The vertical one lands the picture on the page colour at
 * the bottom edge, so the first screen ends in the page rather than in a
 * cut-off photograph.
 *
 * `92svh`, not `100vh`: small-viewport units survive the mobile address
 * bar, and the remaining 8% shows the next section's edge, which is what
 * tells a visitor there is more below.
 */
export function Hero() {
  return (
    /* From `lg` the content hangs off the bottom edge rather than
     * floating in the middle: centred, the gap down to the strip grows
     * with the window, so on a tall display the words drift away from the
     * panel they are supposed to meet. Anchored, that gap is the same on
     * every screen. Below `lg` the strip is in flow and centring is fine. */
    <section className="relative isolate flex min-h-[92svh] items-center overflow-hidden lg:items-end">
      <Image
        src={PHOTO}
        alt="Офіціант у залі ресторану подає страву"
        fill
        // Above the fold: this is what the first paint is judged on.
        priority
        sizes="100vw"
        // Mirrored: unflipped, the waiter stands on the same side as the
        // headline and the two fight for the left third of the screen.
        className="-z-10 object-cover"
      />

      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to right," +
            " color-mix(in srgb, var(--color-bg-deep) 94%, transparent) 0%," +
            " color-mix(in srgb, var(--color-bg-deep) 82%, transparent) 42%," +
            " color-mix(in srgb, var(--color-bg-deep) 35%, transparent) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to top," +
            " var(--color-bg-deep) 0%," +
            " color-mix(in srgb, var(--color-bg-deep) 40%, transparent) 28%," +
            " transparent 60%)",
        }}
      />

      {/* The bottom inset clears the half of the strip that rides up
          over the hero (~94px) and leaves a button's height of air above
          it. */}
      <div className="mx-auto w-full max-w-[72rem] px-[var(--space-4)] py-[var(--space-16)] lg:pb-[9.5rem]">
        <div className="max-w-[56rem]">
          <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
            Вражаючий сервіс для ресторанів
          </span>

          {/* Uppercase at display size needs its own metrics: the line
              box set for sentence case leaves caps floating, and default
              tracking spaces them too loosely once every letter is tall. */}
          <h1 className="mt-[var(--space-4)] text-[length:var(--text-display)] font-[var(--weight-bold)] uppercase leading-[1.05] tracking-[-0.01em] md:text-[3.25rem] lg:text-[4.25rem]">
            {HEADLINE_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-[var(--space-6)] max-w-[38rem] text-[var(--color-text-secondary)] md:text-[length:var(--text-h3)]">
            Платформа навчає команду сервісу, в основі якого турбота про
            гостя: увага до того, що людині потрібно зараз, і трохи більше,
            ніж вона очікує. Вхідний курс дає цей рівень новим працівникам,
            щомісячні вебінари розвивають його в діючих, а звітність показує,
            що враження від залу не слабшає з місяцями.
          </p>

          <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-3)] sm:flex-row">
            <a
              href="#request"
              className="tap inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-6)] font-[var(--weight-semibold)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]"
            >
              Отримати рахунок
            </a>
            <a
              href="#year"
              className="tap inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-[var(--space-6)] font-[var(--weight-semibold)] backdrop-blur hover:bg-[var(--color-surface-raised)]"
            >
              Що входить у річний доступ
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
