"use client";

import { useState, useTransition } from "react";
import { regenerateInvite, type ActionState } from "@/app/actions";
import { Alert, Button, Card, Label } from "@/components/ui";

export function InvitePanel({
  url,
  seatsLeft,
}: {
  url: string;
  seatsLeft: number;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked (insecure origin, or permission denied).
      // The input below is selectable, so there is still a way out.
      setCopied(false);
    }
  }

  function regenerate() {
    startTransition(async () => {
      setState(await regenerateInvite());
      setConfirming(false);
    });
  }

  return (
    <Card>
      <Label>Посилання для команди</Label>
      <p className="mt-[var(--space-2)] mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        Кинь його в робочий чат. Кожен новачок відкриває зі свого телефона й
        займає одне з {seatsLeft} вільних місць.
      </p>

      <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-deep)] px-[var(--space-4)] py-[var(--space-3)] font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]"
        />
        <Button onClick={copy} className="shrink-0">
          {copied ? "Скопійовано" : "Копіювати"}
        </Button>
      </div>

      {state?.ok && (
        <div className="mt-[var(--space-4)]">
          <Alert tone="success">{state.ok}</Alert>
        </div>
      )}
      {state?.error && (
        <div className="mt-[var(--space-4)]">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}

      <div className="mt-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
        {confirming ? (
          <div className="flex flex-col gap-[var(--space-3)]">
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              Старе посилання перестане працювати одразу. Ті, хто вже
              приєднався, доступ збережуть.
            </p>
            <div className="flex gap-[var(--space-3)]">
              <Button variant="danger" onClick={regenerate} disabled={pending}>
                {pending ? "Створюємо…" : "Так, перегенерувати"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Скасувати
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
          >
            Перегенерувати посилання
          </button>
        )}
      </div>
    </Card>
  );
}
