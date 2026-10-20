import { Button, Card, Screen } from "@/components/ui";

export const metadata = { title: "Доступ закрито · Вражаючий сервіс" };

export default function AccessRevokedPage() {
  return (
    <Screen>
      <Card>
        <h1 className="mb-[var(--space-3)] text-[length:var(--text-h2)] font-[var(--weight-bold)]">
          Місце звільнено
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Управляючий звільнив твоє місце в закладі. Прогрес і сертифікат
          збережені — якщо повернешся, зайдеш за тим самим посиланням і
          продовжиш із того місця, де спинився.
        </p>
      </Card>

      <form action="/auth/sign-out" method="post" className="mt-[var(--space-6)]">
        <Button variant="ghost" type="submit">
          Вийти
        </Button>
      </form>
    </Screen>
  );
}
