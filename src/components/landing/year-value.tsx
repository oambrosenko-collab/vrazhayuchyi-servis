import { Card } from "@/components/ui";
import { TRIO } from "./accents";
import { Section, SectionHead } from "./section";

/**
 * The objection section.
 *
 * "Навіщо платити за рік, якщо курс проходиться за три дні" is the first
 * question an owner asks, and the landing used to have no answer to it at
 * all — it described onboarding and then asked for an annual price. The
 * answer goes above the pricing, not into the FAQ under it, because an
 * owner who has not heard it reads every number below as overpriced.
 */
const PILLARS = [
  {
    title: "Щомісяця команда отримує нові прийоми",
    body: "Один вебінар на місяць, одна тема, кілька прийомів турботи, застосовних уже в найближчу зміну. Запис публікується в кабінеті наступного дня, тому графік змін не обмежує доступ до матеріалу.",
  },
  {
    title: "Рівень сервісу тримається, а не відновлюється ривками",
    body: "Регулярне повернення до теми зберігає прийоми в щоденній роботі. Це економніше й швидше за перенавчання команди тоді, коли зниження рівня вже помітне за відгуками та виручкою.",
  },
  {
    title: "Звіт показує стан справ поіменно",
    body: "У звіті наведено дані щодо кожного працівника: проходження курсу, бал за тест, участь в останніх вебінарах, дата останньої активності. Цього достатньо, щоб вчасно побачити, кому потрібна увага керівника.",
  },
];

export function YearValue() {
  return (
    <Section id="year" className="border-t border-[var(--color-border)]">
      <SectionHead
        label="Склад річного доступу"
        labelTone="accent"
        title="Вау-ефект створюється швидко. Утримується — лише системою"
        lead="Навчити команду турботи про гостя можна за кілька змін, і результат помітний одразу. Складність в іншому: через кілька місяців прийоми поступово виходять з ужитку, а склад залу встигає оновитися. Річний доступ — це механізм, який утримує досягнутий рівень: щомісячне оновлення прийомів, тести після модулів і звітність, що показує стан справ поіменно."
      />

      <div className="grid gap-[var(--space-4)] md:grid-cols-3">
        {PILLARS.map((p, i) => (
          <Card key={p.title} className="relative overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: TRIO[i].color }}
            />
            <h3 className="text-center text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
              {p.title}
            </h3>
            <p className="mt-[var(--space-2)] text-[var(--color-text-secondary)]">
              {p.body}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
