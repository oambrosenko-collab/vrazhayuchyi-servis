"use client";

import { useState, useTransition } from "react";
import { releaseSeat, type ActionState } from "@/app/actions";
import { Alert, Button, Card, Label } from "@/components/ui";
import {
  formatDate,
  formatSince,
  summarise,
  toCsv,
  type TeamRow,
} from "@/lib/team";

function ProgressCell({ row }: { row: TeamRow }) {
  const muted = row.status === "removed";
  return (
    <div className="flex items-center gap-[var(--space-3)]">
      <div className="h-[6px] w-[4rem] shrink-0 overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface-raised)]">
        <div
          className={
            "h-full " +
            (muted
              ? "bg-[var(--color-text-muted)]"
              : row.percent >= 100
                ? "bg-[var(--color-success)]"
                : "bg-[var(--color-periwinkle)]")
          }
          style={{ width: `${row.percent}%` }}
        />
      </div>
      <span className="shrink-0 font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        {row.percent}%
      </span>
      <span className="shrink-0 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        {row.lessons_done}/{row.lessons_total}
      </span>
    </div>
  );
}

export function TeamTable({
  rows,
  currentUserId,
}: {
  rows: TeamRow[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [state, setState] = useState<ActionState>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const team = summarise(rows);
  const visible = tab === "active" ? team.active : team.released;

  function release(id: string) {
    const form = new FormData();
    form.set("user_id", id);
    startTransition(async () => {
      setState(await releaseSeat(null, form));
      setConfirmId(null);
    });
  }

  function exportCsv() {
    // A download the browser builds itself: the whole report is already
    // in memory, so a round trip to the server would only add latency.
    const blob = new Blob([toCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `komanda-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <div className="mb-[var(--space-4)] flex flex-wrap items-center justify-between gap-[var(--space-3)]">
        <div className="flex gap-[var(--space-1)]">
          {(["active", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                "min-h-[var(--tap-min)] rounded-[var(--radius-full)] px-[var(--space-4)] text-[length:var(--text-sm)] " +
                (tab === t
                  ? "bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                  : "text-[var(--color-text-secondary)]")
              }
            >
              {t === "active"
                ? `Активні · ${team.active.length}`
                : `Історія · ${team.released.length}`}
            </button>
          ))}
        </div>

        <Button variant="neutral" onClick={exportCsv}>
          Експорт CSV
        </Button>
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
            ? "Поки нікого. Надішли команді посилання з кабінету."
            : "Ніхто ще не звільняв місце."}
        </p>
      ) : (
        <div className="-mx-[var(--space-6)] overflow-x-auto px-[var(--space-6)]">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {[
                  "Ім'я",
                  "Пошта",
                  "Приєднався",
                  "Пройдено",
                  tab === "active" ? "Остання активність" : "Звільнено",
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="py-[var(--space-3)] pr-[var(--space-4)] text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[var(--color-text-secondary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const isStuck = team.stuck.some(
                  (s) => s.user_id === r.user_id,
                );
                return (
                  <tr
                    key={r.user_id}
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
                      {formatDate(r.joined_at)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)]">
                      <ProgressCell row={r} />
                    </td>
                    <td
                      className={
                        "py-[var(--space-3)] pr-[var(--space-4)] text-[length:var(--text-sm)] " +
                        (tab === "active" && isStuck
                          ? "text-[var(--color-warning)]"
                          : "text-[var(--color-text-secondary)]")
                      }
                    >
                      {tab === "active"
                        ? formatSince(r.last_seen_at)
                        : formatDate(r.removed_at)}
                    </td>
                    <td className="py-[var(--space-3)] text-right">
                      {r.status === "active" &&
                        r.user_id !== currentUserId &&
                        (confirmId === r.user_id ? (
                          <span className="inline-flex gap-[var(--space-2)]">
                            <Button
                              variant="danger"
                              onClick={() => release(r.user_id)}
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
                            onClick={() => setConfirmId(r.user_id)}
                          >
                            Звільнити місце
                          </Button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && visible.length > 0 && (
        <p className="mt-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Прогрес цих людей збережений. Якщо хтось повернеться — зайде за тим
          самим посиланням і продовжить з того місця, де спинився.
        </p>
      )}

      <div className="mt-[var(--space-4)] border-t border-[var(--color-border)] pt-[var(--space-4)]">
        <Label>Як читати «пройдено»</Label>
        <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Урок зараховується автоматично на 90% переглянутого відео.
          Перемотати в кінець не вийде — рахується тільки реально
          прослуханий час.
        </p>
      </div>
    </Card>
  );
}
