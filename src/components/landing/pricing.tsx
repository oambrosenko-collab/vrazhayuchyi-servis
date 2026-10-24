import { TRIO } from "./accents";
import { Section, SectionHead } from "./section";

/** Packages and per-seat prices are the PRD's business model table. */
const PACKAGES = [
  {
    name: "Заклад",
    seats: 10,
    price: "$500",
    perSeat: "$50 за місце",
    who: "Кав'ярня або невеликий ресторан",
    featured: false,
  },
  {
    name: "Ресторан",
    seats: 25,
    price: "$1000",
    perSeat: "$40 за місце",
    who: "Стандартний заклад — основний пакет",
    featured: true,
  },
  {
    name: "Великий заклад",
    seats: 50,
    price: "$1500",
    perSeat: "$30 за місце",
    who: "Великий ресторан або два заклади",
    featured: false,
  },
];

const INCLUDED = [
  "Вхідний курс і доступ на 12 місяців",
  "Місця з правом перевикористання",
  "Щомісячні вебінари та архів записів",
  "Сертифікати для персоналу",
  "Звітність для керівника закладу",
];

const EXCLUDED = [
  "Кастомний контент під заклад",
  "Приватні зустрічі",
  "Брендинг платформи",
];

export function Pricing() {
  return (
    <Section id="pricing" className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <SectionHead
        label="Ціни"
        labelTone="accent"
        title="Разова оплата, доступ на 12 місяців"
        lead="У вартість пакета входить усе, що утримує рівень сервісу протягом року: вхідний курс для кожного нового працівника, дванадцять вебінарів із новими прийомами, тести, сертифікати та звітність для керівника. Для орієнтиру: витрати на самостійну підготовку одного новачка силами управляючого, помножені на п'ятнадцять новачків за рік, зазвичай перевищують вартість пакета."
      />

      <div className="grid gap-[var(--space-4)] md:grid-cols-3">
        {PACKAGES.map((p) => (
          <div
            key={p.name}
            className={
              "flex flex-col rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-[var(--space-6)] " +
              (p.featured
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-border)]")
            }
          >
            <div className="flex items-center justify-between gap-[var(--space-2)]">
              <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                {p.name}
              </span>
              {p.featured && (
                <span className="rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)] font-[var(--weight-semibold)] text-[var(--color-accent)]">
                  Найчастіший вибір
                </span>
              )}
            </div>

            <p className="mt-[var(--space-4)] text-[length:var(--text-display)] font-[var(--weight-bold)]">
              {p.price}
            </p>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {p.seats} місць · {p.perSeat}
            </p>
            <p className="mt-[var(--space-4)] grow text-[var(--color-text-secondary)]">
              {p.who}
            </p>

            {/* One accent per screen: only the featured card gets the
                filled button, the others stay neutral. */}
            <a
              href="#request"
              className={
                "tap mt-[var(--space-6)] inline-flex items-center justify-center rounded-[var(--radius-md)] px-[var(--space-4)] font-[var(--weight-semibold)] " +
                (p.featured
                  ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]"
                  : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface)]")
              }
            >
              Отримати рахунок
            </a>
          </div>
        ))}
      </div>

      <div className="mt-[var(--space-6)] grid gap-[var(--space-6)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)] md:grid-cols-3">
        <div>
          <h3
            className="flex items-center gap-[var(--space-2)] font-[var(--weight-semibold)]"
            style={{ color: TRIO[0].color }}
          >
            <span
              aria-hidden
              className="h-[2px] w-[1.25rem] shrink-0"
              style={{ background: TRIO[0].color }}
            />
            Входить у пакет
          </h3>
          <ul className="mt-[var(--space-2)] flex flex-col gap-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            {INCLUDED.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3
            className="flex items-center gap-[var(--space-2)] font-[var(--weight-semibold)]"
            style={{ color: TRIO[1].color }}
          >
            <span
              aria-hidden
              className="h-[2px] w-[1.25rem] shrink-0"
              style={{ background: TRIO[1].color }}
            />
            Не входить
          </h3>
          <ul className="mt-[var(--space-2)] flex flex-col gap-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            {EXCLUDED.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3
            className="flex items-center gap-[var(--space-2)] font-[var(--weight-semibold)]"
            style={{ color: TRIO[2].color }}
          >
            <span
              aria-hidden
              className="h-[2px] w-[1.25rem] shrink-0"
              style={{ background: TRIO[2].color }}
            />
            Мережа, 50+ місць
          </h3>
          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Ціна індивідуальна — напишіть кількість закладів і людей у заявці.
            Рахунок для української компанії виставляється в гривні за курсом
            на день виставлення.
          </p>
        </div>
      </div>
    </Section>
  );
}
