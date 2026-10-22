import { Card } from "@/components/ui";
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
    title: "Дванадцять приводів повернутися в тему",
    body: "Один ефір на місяць, одна тема, кілька прийомів, які офіціант застосує вже в найближчу зміну. Запис з'являється в кабінеті наступного дня, тож графік змін нікого не виключає.",
  },
  {
    title: "Навичка, яку не повторюють, зникає першою",
    body: "Через місяць після курсу структура в голові лишається, прийоми — ні. Щомісячний ритм повертає їх у роботу, і це дешевше, ніж збирати команду на перенавчання тоді, коли просідання вже помітне за виручкою.",
  },
  {
    title: "Не «команда навчена», а хто саме",
    body: "У звіті поіменно: хто пройшов курс, з яким балом склав тест, хто був на останніх розборах, хто не відкривав застосунок тиждень. Це той документ, з яким є сенс іти до управляючого.",
  },
];

export function YearValue() {
  return (
    <Section id="year" className="border-t border-[var(--color-border)]">
      <SectionHead
        label="Чому це не просто курс"
        title="Курс закінчується за три дні. Проблема — ні"
        lead="Це перше, що питає власник, і питання чесне. Відеокурс — разова подія, а плинність і вигорання працюють щодня. Рік ви оплачуєте не за доступ до відео, а за те, щоб рівень залу не просідав у проміжках між вашими перевірками."
      />

      <div className="grid gap-[var(--space-4)] md:grid-cols-3">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <h3 className="text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
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
