"use client";

import * as React from "react";
import { Button, Field, Input } from "@/components/ui";
import { Section, SectionHead } from "./section";

/** Labels live here rather than in JSX: they carry apostrophes. */
const SEAT_OPTIONS = [
  { value: "10", label: "10 — кав'ярня, невеликий ресторан" },
  { value: "25", label: "25 — стандартний заклад" },
  { value: "50", label: "50 — великий заклад або два" },
  { value: "50+", label: "50+ — мережа" },
];

/**
 * Where the request goes — change this one line and the whole section
 * follows. A landing-specific mailbox belongs here once there is a domain.
 */
const CONTACT_EMAIL = "o.ambrosenko@gmail.com";

/**
 * The form composes a letter and hands it to the visitor's mail client.
 *
 * It deliberately stores nothing. There is no `orders` table by decision,
 * and Resend is not connected while the project has no verified domain —
 * so a form that POSTed somewhere would either need a new table (a
 * decision of its own) or quietly drop what people typed. A prefilled
 * letter is the honest version: the visitor sees exactly what is sent,
 * and it lands in a mailbox that is actually read.
 *
 * The visible address below is the fallback for anyone whose browser has
 * no mail client wired up — without it, the button is a dead end for them.
 */
export function RequestForm() {
  const [sent, setSent] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const venue = String(data.get("venue") ?? "");
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const seats = String(data.get("seats") ?? "");
    const note = String(data.get("note") ?? "");

    const body = [
      `Заклад: ${venue}`,
      `Контактна особа: ${name}`,
      `Email для рахунка: ${email}`,
      `Кількість місць: ${seats}`,
      note && `\n${note}`,
    ]
      .filter(Boolean)
      .join("\n");

    const href =
      `mailto:${CONTACT_EMAIL}` +
      `?subject=${encodeURIComponent(`Заявка на рахунок — ${venue || "заклад"}`)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    setSent(true);
  }

  return (
    <Section id="request" className="border-t border-[var(--color-border)]">
      <div className="grid gap-[var(--space-8)] md:grid-cols-2 md:gap-[var(--space-16)]">
        <SectionHead
          label="Заявка"
          title="Виставлю рахунок протягом робочого дня"
          lead="Заповніть чотири поля — кнопка відкриє ваш поштовий клієнт із готовим листом, лишиться натиснути «Надіслати». Рахунок прийде на вказану пошту, доступ відкриється після оплати."
        />

        <div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-[var(--space-4)]"
          >
            <Field label="Назва закладу">
              <Input name="venue" required autoComplete="organization" />
            </Field>
            <Field label="Ваше ім'я">
              <Input name="name" required autoComplete="name" />
            </Field>
            <Field label="Email для рахунка">
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
              />
            </Field>
            <Field
              label="Кількість місць"
              hint="Орієнтовно — уточнимо в листуванні"
            >
              <select
                name="seats"
                defaultValue="25"
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-body)] text-[var(--color-text)] outline-none focus:border-[var(--color-border-strong)]"
              >
                {SEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Коментар" hint="Не обов'язково">
              <textarea
                name="note"
                rows={3}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-body)] text-[var(--color-text)] outline-none focus:border-[var(--color-border-strong)]"
              />
            </Field>

            <Button type="submit" full>
              Відкрити лист із заявкою
            </Button>
          </form>

          <p
            aria-live="polite"
            className="mt-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]"
          >
            {sent
              ? "Лист відкрився в поштовому клієнті — перевірте його й надішліть."
              : "Якщо пошта не відкриється, напишіть напряму:"}
          </p>
          {!sent && (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="tap inline-flex items-center text-[length:var(--text-sm)] text-[var(--color-text)] underline"
            >
              {CONTACT_EMAIL}
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}
