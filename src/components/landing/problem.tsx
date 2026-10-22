import { Card, Label } from "@/components/ui";
import { Section, SectionHead } from "./section";

/**
 * Two causes, not one.
 *
 * The earlier version blamed turnover alone, which quietly argued that the
 * product is onboarding — and onboarding is exactly what an owner refuses
 * to pay a year for. The second cause is the one that makes a year make
 * sense: a waiter who has been here twelve months is also drifting.
 *
 * Only the turnover half carries numbers, because only it has sourced
 * ones. The decay half stays prose rather than inventing a statistic.
 */
const TURNOVER_FACTS = [
  {
    value: "50–100%",
    label: "Плинність",
    hint: "За рік зал оновлюється майже повністю",
  },
  {
    value: "2–3 дні",
    label: "Від найму до зміни",
    hint: "Стільки реально лишається на підготовку",
  },
  {
    value: "~15 людей",
    label: "Новачків за рік",
    hint: "У закладі на 25 осіб при плинності 60%",
  },
];

export function Problem() {
  return (
    <Section className="border-t border-[var(--color-border)]">
      <SectionHead
        label="Чому так стається"
        title="Рівень залу тримається на двох-трьох людях, а не на системі"
        lead="Поки сильні офіціанти в зміні, усе добре, і здається, що процес налагоджений. Процесу немає — є конкретні люди. Один пішов у заклад навпроти, другий вигорів, третій вийшов у зал позавчора й не знає, як підійти до столика з дитиною. Гість цього не аналізує — він просто більше не бронює."
      />

      <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
        Перше: зал змінюється швидше, ніж ви встигаєте вчити
      </span>

      <div className="mt-[var(--space-4)] grid gap-[var(--space-4)] sm:grid-cols-3">
        {TURNOVER_FACTS.map((f) => (
          <Card key={f.label}>
            <Label>{f.label}</Label>
            <p className="mt-[var(--space-2)] text-[length:var(--text-display)] font-[var(--weight-bold)]">
              {f.value}
            </p>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {f.hint}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-[var(--space-8)] max-w-[44rem] border-l border-[var(--color-border-strong)] pl-[var(--space-4)]">
        <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
          Друге: те, чого не буде видно у скаргах
        </span>
        <p className="mt-[var(--space-3)] text-[var(--color-text-secondary)]">
          Офіціант, який працює рік, не порушує жодного правила. Він просто
          вітається коротше, ніж колись, перестає рекомендувати, бо «і так
          замовлять», і проковтує прощання, коли зал повний. Жодна з цих
          дрібниць не дійде до вас скаргою. Вони осідають у середньому чеку й у
          тому, що столик у вівторок знову порожній.
        </p>
      </div>
    </Section>
  );
}
