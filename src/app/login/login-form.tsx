"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendMagicLink, type ActionState } from "@/app/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending}>
      {pending ? "Надсилаємо…" : "Надіслати посилання"}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    sendMagicLink,
    null,
  );

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-[var(--space-4)]">
        <Alert tone="success">
          Лист надіслано на <strong>{state.ok}</strong>. Посилання в ньому
          одноразове й живе годину.
        </Alert>
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Не прийшло за хвилину? Перевір теку «Спам».
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-[var(--space-4)]">
      <input type="hidden" name="next" value={next} />
      <Field label="Робоча пошта" error={state?.error}>
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
      <Submit />
    </form>
  );
}
