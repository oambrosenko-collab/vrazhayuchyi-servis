import { Section, SectionHead } from "./section";

const STEPS = [
  {
    title: "Берете пакет місць",
    body: "10, 25 або 50 — за кількістю людей у залі, з запасом на плинність. Доступ до курсу й вебінарів на дванадцять місяців від дня оплати, разово: без підписки, автосписань і прив'язаної картки.",
  },
  {
    title: "Кидаєте одне посилання в робочий чат",
    body: "Ніяких корпоративних пошт і заведення кожного вручну: у офіціантів немає ні того, ні часу на це. Лінк обмежений кількістю куплених місць і перегенеровується однією кнопкою, якщо розійшовся далі чату.",
  },
  {
    title: "Далі тільки читаєте звіт",
    body: "Хто пройшов курс, хто застряг, хто був на останньому розборі, хто не заходив тиждень. Урок зараховується автоматично на 90% перегляду, а не галочкою «я подивився», — тому звіту можна вірити, а не вірити комусь на слово.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" className="border-t border-[var(--color-border)]">
      <SectionHead
        label="Як це влаштовано"
        title="Вашої участі вистачає на два кроки"
      />

      <ol className="grid gap-[var(--space-6)] md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            {/* The number is the accent here, so the step headings stay
                neutral — one accent per screen. */}
            <span className="flex h-[2.5rem] w-[2.5rem] items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] text-[length:var(--text-h3)] font-[var(--weight-bold)] text-[var(--color-accent)]">
              {i + 1}
            </span>
            <h3 className="mt-[var(--space-4)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
              {s.title}
            </h3>
            <p className="mt-[var(--space-2)] text-[var(--color-text-secondary)]">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
