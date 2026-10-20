"use client";

import { useState, useTransition } from "react";
import { releaseSeat, type ActionState } from "@/app/actions";
import { Alert, Button, Card, Label } from "@/components/ui";

type Row = {
  id: string;
  full_name: string;
  email: string;
  role: "employee" | "org_admin" | "superadmin";
  status: "active" | "removed";
  joined_at: string;
  removed_at: string | null;
};

function date(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "short" }).format(
    new Date(iso),
  );
}

export function TeamTable({
  rows,
  currentUserId,
}: {
  rows: Row[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [state, setState] = useState<ActionState>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = rows.filter((r) =>
    tab === "active" ? r.status === "active" : r.status === "removed",
  );

  function release(id: string) {
    const form = new FormData();
    form.set("user_id", id);
    startTransition(async () => {
      setState(await releaseSeat(null, form));
      setConfirmId(null);
    });
  }

  return (
    <Card>
      <div className="mb-[var(--space-4)] flex items-center justify-between gap-[var(--space-4)]">
        <Label>Команда</Label>
        <div className="flex gap-[var(--space-1)]">
          {(["active", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                "rounded-[var(--radius-full)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] " +
                (tab === t
                  ? "bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                  : "text-[var(--color-text-secondary)]")
              }
            >
              {t === "active" ? "Активні" : "Історія"}
            </button>
          ))}
        </div>
      </div>

      {state?.ok && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="success">{state.ok}</Alert>
        </div>
      )}
      {state?.error && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-[var(--space-6)] text-center text-[var(--color-text-secondary)]">
          {tab === "active"
            ? "Поки нікого. Надішли команді посилання вище."
            : "Ніхто ще не звільняв місце."}
        </p>
      ) : (
        <div className="-mx-[var(--space-6)] overflow-x-auto px-[var(--space-6)]">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="py-[var(--space-3)] text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[var(--color-text-secondary)]">
                  Ім&apos;я
                </th>
                <th className="py-[var(--space-3)] text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[var(--color-text-secondary)]">
                  Пошта
                </th>
                <th className="py-[var(--space-3)] text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[var(--color-text-secondary)]">
                  {tab === "active" ? "Приєднався" : "Звільнено"}
                </th>
                <th className="py-[var(--space-3)]" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td
                    className={
                      "py-[var(--space-3)] pr-[var(--space-4)] " +
                      (r.status === "removed"
                        ? "text-[var(--color-text-muted)]"
                        : "")
                    }
                  >
                    {r.full_name}
                    {r.role !== "employee" && (
                      <span className="ml-[var(--space-2)] text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                        адмін
                      </span>
                    )}
                  </td>
                  <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                    {r.email}
                  </td>
                  <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                    {date(r.status === "active" ? r.joined_at : r.removed_at)}
                  </td>
                  <td className="py-[var(--space-3)] text-right">
                    {r.status === "active" &&
                      r.id !== currentUserId &&
                      (confirmId === r.id ? (
                        <span className="inline-flex gap-[var(--space-2)]">
                          <Button
                            variant="danger"
                            onClick={() => release(r.id)}
                            disabled={pending}
                          >
                            Звільнити
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setConfirmId(null)}
                          >
                            Ні
                          </Button>
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmId(r.id)}
                        >
                          Звільнити місце
                        </Button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && visible.length > 0 && (
        <p className="mt-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Прогрес і сертифікати цих людей збережені. Якщо хтось повернеться —
          зайде за тим самим посиланням і продовжить з того місця, де спинився.
        </p>
      )}
    </Card>
  );
}
