import { TRIO } from "./accents";
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
    title: "Доступ закривається в день звільнення",
    body: "Управляючий звільняє місце в кабінеті однією дією. Працівник, який залишив заклад, втрачає доступ до курсу та архіву вебінарів.",
  },
  {
    title: "Результати навчання зберігаються за закладом",
    body: "Прогрес, результати тестів і сертифікат залишаються в історії. У разі повернення працівника — а в галузі це поширена практика — навчання продовжується з того ж етапу.",
  },
  {
    title: "Місце переходить наступному працівнику",
    body: "Без участі керівника та без додаткової оплати. Пакет на 25 місць розрахований на стовідсоткову плинність із запасом: протягом дванадцяти місяців через нього може пройти до 75 осіб.",
  },
];

export function SeatReuse() {
  return (
    <Section className="border-t border-[var(--color-border)]">
      <div className="grid gap-[var(--space-8)] md:grid-cols-2 md:gap-[var(--space-16)]">
        <SectionHead
          label="Плинність персоналу"
          labelTone="accent"
          title="Рівень залу не падає разом зі зміною складу команди"
          lead="Заклад оплачує не персональні доступи, а місця: кожне залишається робочим увесь рік незалежно від того, скільки людей через нього пройде. Новий працівник заходить на звільнене місце й отримує той самий курс і ті самі вебінари, що й решта команди."
        />

        <ul className="flex flex-col gap-[var(--space-6)]">
          {POINTS.map((p, i) => (
            <li
              key={p.title}
              className="border-l-2 pl-[var(--space-4)]"
              style={{ borderColor: TRIO[i].color }}
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
