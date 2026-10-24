import { TRIO } from "./accents";
import { Section, SectionHead } from "./section";

const STEPS = [
  {
    title: "Придбання пакета місць",
    body: "10, 25 або 50 місць — за чисельністю залу з урахуванням плинності. Доступ до курсу та вебінарів надається на дванадцять місяців від дати оплати. Оплата разова, без підписки, автоматичних списань і прив'язки картки.",
  },
  {
    title: "Передача посилання команді",
    body: "Одне посилання на заклад, без корпоративних адрес і реєстрації кожного працівника вручну. Кількість приєднань обмежена кількістю придбаних місць; посилання перегенеровується однією дією, якщо вийшло за межі робочого чату.",
  },
  {
    title: "Контроль за звітністю",
    body: "Проходження курсу, результати тестів, участь у вебінарах і дата останньої активності — щодо кожного працівника. Урок зараховується автоматично після перегляду 90% відео, тому звіт відображає фактичний стан, а не самооцінку.",
  },
];

/**
 * The steps as a track, after the reference.
 *
 * Each step is a stadium open on one side, and the sides alternate, so the
 * three of them read as one line folding back on itself rather than as
 * three cards in a row. There is no gap between them: the bottom edge of
 * one is the top edge of the next, which is what keeps the line unbroken.
 *
 * The numeral is the decorative part — large, in the step's own hue at low
 * opacity, sitting on the open side where the track would continue. It
 * never carries information the heading does not already give, so dropping
 * its contrast costs nothing.
 *
 * Below `md` the offsets and the big radii collapse: at 390px an inset of
 * eighteen percent leaves no room for the text, and a 3rem corner on a
 * narrow block eats the first word.
 */
export function HowItWorks() {
  return (
    <Section id="how" className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <SectionHead
        label="Порядок роботи"
        labelTone="accent"
        title="Від оплати до першого звіту — три кроки"
      />

      <ol className="flex flex-col">
        {STEPS.map((s, i) => {
          const openRight = i % 2 === 0;
          const tone = TRIO[i].color;

          return (
            <li
              key={s.title}
              className={
                openRight ? "md:pr-[16%]" : "md:pl-[16%]"
              }
            >
              <div
                className={
                  "relative flex items-center gap-[var(--space-6)] border-y border-[var(--color-border-strong)] px-[var(--space-6)] py-[var(--space-8)] md:gap-[var(--space-12)] md:px-[var(--space-12)] md:py-[var(--space-12)] " +
                  (openRight
                    ? "rounded-l-[var(--radius-xl)] border-l md:rounded-l-[4rem]"
                    : "rounded-r-[var(--radius-xl)] border-r md:rounded-r-[4rem] md:flex-row-reverse")
                }
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-[length:var(--text-h3)] font-[var(--weight-bold)] uppercase tracking-[var(--tracking-label)]">
                    {s.title}
                  </h3>
                  <p className="mt-[var(--space-3)] max-w-[34rem] text-[var(--color-text-secondary)]">
                    {s.body}
                  </p>
                </div>

                <span
                  aria-hidden
                  className="shrink-0 text-[3.5rem] font-[var(--weight-bold)] leading-none opacity-35 md:text-[6rem]"
                  style={{ color: tone }}
                >
                  {i + 1}
                </span>

                {/* The dot the reference puts where one run of the track
                    hands over to the next. */}
                <span
                  aria-hidden
                  className={
                    "absolute top-[-3px] hidden h-[6px] w-[6px] rounded-[var(--radius-full)] md:block " +
                    (openRight ? "right-0" : "left-0")
                  }
                  style={{ background: tone }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
