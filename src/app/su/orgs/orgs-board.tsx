"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Label } from "@/components/ui";
import type { FunctionReturns } from "@/lib/supabase/types";
import {
  addSeats,
  createOrganization,
  extendAccess,
  setOrgStatus,
  type SuResult,
} from "../actions";

type Row = FunctionReturns<"su_organizations">;

const STATUS_LABEL: Record<string, string> = {
  trial: "пробний",
  active: "активний",
  expired: "прострочений",
  suspended: "призупинений",
};

function date(iso: string | null) {
  if (!iso) return "безстроково";
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "short" }).format(
    new Date(iso),
  );
}

function Bar({ percent, tone }: { percent: number; tone: "seats" | "learn" }) {
  const color =
    tone === "seats"
      ? percent >= 60
        ? "bg-[var(--color-success)]"
        : "bg-[var(--color-warning)]"
      : "bg-[var(--color-periwinkle)]";
  return (
    <div className="flex items-center gap-[var(--space-2)]">
      <div className="h-[6px] w-[3.5rem] shrink-0 overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface-raised)]">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="shrink-0 font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        {percent}%
      </span>
    </div>
  );
}

export function OrgsBoard({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<SuResult>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<SuResult>) {
    startTransition(async () => setState(await fn()));
  }

  return (
    <>
      <div className="mb-[var(--space-6)] flex flex-wrap items-center justify-between gap-[var(--space-4)]">
        <h1 className="text-[length:var(--text-h1)] font-[var(--weight-bold)]">
          Заклади
        </h1>
        <Button onClick={() => setCreating((v) => !v)}>
          {creating ? "Згорнути" : "Створити заклад"}
        </Button>
      </div>

      {state.ok && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="success">{state.ok}</Alert>
        </div>
      )}
      {state.error && (
        <div className="mb-[var(--space-4)]">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}

      {creating && (
        <Card className="mb-[var(--space-6)]">
          <Label>Новий заклад</Label>
          <p className="mt-[var(--space-2)] mb-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Доступ відкривається одразу. Перша людина, яка зайде за
            посиланням із цією поштою, автоматично стане адміном закладу —
            решта будуть офіціантами.
          </p>
          <form
            action={(fd) => {
              run(async () => {
                const r = await createOrganization(fd);
                if (r.ok) setCreating(false);
                return r;
              });
            }}
            className="grid gap-[var(--space-4)] sm:grid-cols-2"
          >
            <Field label="Назва закладу">
              <Input name="name" required minLength={2} placeholder="Ресторан «Вечір»" />
            </Field>
            <Field label="Пошта власника">
              <Input
                name="admin_email"
                type="email"
                required
                autoCapitalize="none"
                placeholder="owner@example.com"
              />
            </Field>
            <Field label="Місць у пакеті">
              <Input
                name="package_size"
                type="number"
                min={1}
                max={1000}
                defaultValue={25}
                required
              />
            </Field>
            <Field label="Місяців доступу">
              <Input
                name="months"
                type="number"
                min={1}
                max={60}
                defaultValue={12}
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending} full>
                {pending ? "Створюємо…" : "Створити"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {rows.length === 0 ? (
        <Alert tone="info">Закладів поки немає.</Alert>
      ) : (
        <div className="flex flex-col gap-[var(--space-4)]">
          {rows.map((o) => {
            const lapsed = o.days_left !== null && o.days_left <= 0;
            const open = openId === o.id;
            return (
              <Card key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-[var(--space-4)]">
                  <div className="min-w-0">
                    <h2 className="text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
                      {o.name}
                    </h2>
                    <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                      {o.admin_email ?? "без адміна"}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-[var(--radius-full)] px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] " +
                      (o.status === "suspended" || lapsed
                        ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                        : "bg-[var(--color-success-soft)] text-[var(--color-success)]")
                    }
                  >
                    {lapsed && o.status !== "suspended"
                      ? "прострочений"
                      : (STATUS_LABEL[o.status] ?? o.status)}
                  </span>
                </div>

                <div className="mt-[var(--space-4)] grid gap-[var(--space-3)] sm:grid-cols-4">
                  <div>
                    <Label>Місця</Label>
                    <p className="mt-[var(--space-1)]">
                      {o.seats_taken} із {o.package_size}
                    </p>
                  </div>
                  <div>
                    <Label>Активація</Label>
                    <div className="mt-[var(--space-2)]">
                      <Bar percent={o.activation} tone="seats" />
                    </div>
                  </div>
                  <div>
                    <Label>Середній прогрес</Label>
                    <div className="mt-[var(--space-2)]">
                      <Bar percent={o.avg_percent} tone="learn" />
                    </div>
                  </div>
                  <div>
                    <Label>Доступ до</Label>
                    <p
                      className={
                        "mt-[var(--space-1)] " +
                        (lapsed ? "text-[var(--color-danger)]" : "")
                      }
                    >
                      {date(o.expires_at)}
                      {o.days_left !== null && o.days_left > 0 && (
                        <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                          {" "}
                          · {o.days_left} дн.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* The abuse guard from the PRD: a package resold through
                    an endless stream of people stops being a package. */}
                {o.cumulative_users > o.package_size * 3 * 0.8 && (
                  <div className="mt-[var(--space-4)]">
                    <Alert tone="warning">
                      За весь час через пакет пройшло {o.cumulative_users} осіб
                      із {o.package_size * 3} допустимих.
                    </Alert>
                  </div>
                )}

                <div className="mt-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
                  {open ? (
                    <div className="flex flex-col gap-[var(--space-4)]">
                      <div className="flex flex-wrap gap-[var(--space-2)]">
                        <Button
                          variant="neutral"
                          disabled={pending}
                          onClick={() => run(() => extendAccess(o.id, 12))}
                        >
                          Продовжити на рік
                        </Button>
                        <Button
                          variant="neutral"
                          disabled={pending}
                          onClick={() => run(() => extendAccess(o.id, 1))}
                        >
                          +1 місяць
                        </Button>
                        <Button
                          variant="neutral"
                          disabled={pending}
                          onClick={() => run(() => addSeats(o.id, 5))}
                        >
                          +5 місць
                        </Button>
                        <Button
                          variant="neutral"
                          disabled={pending}
                          onClick={() => run(() => addSeats(o.id, -5))}
                        >
                          −5 місць
                        </Button>
                        {o.status === "suspended" ? (
                          <Button
                            variant="neutral"
                            disabled={pending}
                            onClick={() => run(() => setOrgStatus(o.id, "active"))}
                          >
                            Відновити
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            disabled={pending}
                            onClick={() =>
                              run(() => setOrgStatus(o.id, "suspended"))
                            }
                          >
                            Призупинити
                          </Button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenId(null)}
                        className="w-fit text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
                      >
                        Згорнути
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenId(o.id)}
                      className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] underline"
                    >
                      Дії із закладом
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
