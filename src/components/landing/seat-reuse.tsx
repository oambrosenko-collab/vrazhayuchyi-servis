import { Section, SectionHead } from "./section";

/**
 * The turnover half of the annual price. The decay half is `YearValue`.
 *
 * This used to be labelled "ядро цінності" and carry the whole argument,
 * which is what made the product sound like onboarding. It answers one of
 * the two causes in `Problem`, and reads as such.
 */
const POINTS = [
  {
    title: "Доступ закривається того ж дня",
    body: "Управляючий звільняє місце однією кнопкою. Людина, яка пішла, більше не відкриє ні курс, ні архів розборів.",
  },
  {
    title: "Те, за що ви заплатили, лишається у вас",
    body: "Прогрес, бали й сертифікат зберігаються. Якщо людина повернеться — а в HoReCa це радше правило, ніж виняток, — вона продовжить із того місця, де спинилась.",
  },
  {
    title: "Наступний заходить за тим самим лінком",
    body: "Без вашої участі й без доплат. Пакет на 25 місць витримує стовідсоткову плинність із запасом: за дванадцять місяців через нього можна провести до 75 людей.",
  },
];

export function SeatReuse() {
  return (
    <Section className="border-t border-[var(--color-border)]">
      <div className="grid gap-[var(--space-8)] md:grid-cols-2 md:gap-[var(--space-16)]">
        <SectionHead
          label="Плинність"
          title="Офіціант пішов — місце лишилось у закладі"
          lead="Ви вже платили за навчання людей, які не дочекалися кінця випробувального. Тут ви купуєте не персональні доступи, а місця — і кожне працює весь рік, скільки б людей через нього не пройшло."
        />

        <ul className="flex flex-col gap-[var(--space-6)]">
          {POINTS.map((p) => (
            <li
              key={p.title}
              className="border-l border-[var(--color-border-strong)] pl-[var(--space-4)]"
            >
              <h3 className="text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
                {p.title}
              </h3>
              <p className="mt-[var(--space-1)] text-[var(--color-text-secondary)]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
