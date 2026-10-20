import Link from "next/link";
import { Card, Label, Screen } from "@/components/ui";

export default function Home() {
  return (
    <Screen>
      <Label>Вражаючий сервіс</Label>
      <h1 className="mt-[var(--space-2)] mb-[var(--space-4)] text-[length:var(--text-display)] font-[var(--weight-bold)]">
        Навчання персоналу, яке переживає плинність
      </h1>
      <p className="mb-[var(--space-8)] text-[var(--color-text-secondary)]">
        Лендінг ще попереду. Зараз працює фундамент: вхід, заклади й
        посилання-інвайт.
      </p>

      <Card>
        <p className="mb-[var(--space-4)] text-[var(--color-text-secondary)]">
          Є посилання від управляючого — відкрий його. Уже вчишся тут:
        </p>
        <Link
          href="/login"
          className="tap inline-flex items-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-6)] py-[var(--space-3)] font-[var(--weight-semibold)] text-[var(--color-text-on-accent)]"
        >
          Увійти
        </Link>
      </Card>
    </Screen>
  );
}
