"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  claimViewAccess,
  sendMagicLink,
  type ActionState,
} from "@/app/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}

/**
 * Step one, for a visitor who is not signed in yet: collect an email and
 * send the magic link back to this same page. Same two-step shape as the
 * employee invite — this link does not skip authentication, it only
 * skips the owner's own inbox.
 */
export function RequestViewLinkForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    sendMagicLink,
    null,
  );

  if (state?.ok) {
    return (
      <Alert tone="success">
        Лист надіслано на <strong>{state.ok}</strong>. Відкрий посилання з
        листа — і одразу потрапиш усередину.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-[var(--space-4)]">
      <input type="hidden" name="next" value={`/view/${token}`} />
      <Field
        label="Твоя пошта"
        hint="Надішлемо посилання для входу. Пароль вигадувати не треба."
        error={state?.error}
      >
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="ivan@example.com"
        />
      </Field>
      <Submit idle="Отримати посилання" busy="Надсилаємо…" />
    </form>
  );
}

/**
 * Step two, after the magic link: the person is authenticated, so all
 * that is left is a name — shown nowhere an employee's would be, this
 * is purely so the screen has something to greet them by.
 */
export function ClaimViewForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    claimViewAccess,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-[var(--space-4)]">
      <input type="hidden" name="token" value={token} />
      <Field
        label="Як тебе звати"
        hint={`Вхід: ${email}`}
        error={state?.error}
      >
        <Input
          name="full_name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          placeholder="Ім'я Прізвище"
        />
      </Field>
      <Submit idle="Переглянути" busy="Заходимо…" />
    </form>
  );
}
