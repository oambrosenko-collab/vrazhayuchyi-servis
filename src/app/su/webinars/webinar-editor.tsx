"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Label } from "@/components/ui";
import type { FunctionReturns } from "@/lib/supabase/types";
import {
  formatWebinarDateTime,
  isoToKyivParts,
  TOUCH_MEANING,
} from "@/lib/webinars";
import { deleteWebinar, saveWebinar, type SuResult } from "../actions";

export type WebinarAdminRow = FunctionReturns<"su_webinars">;

const FIELD_CLASS =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] " +
  "bg-[var(--color-surface-raised)] px-[var(--space-4)] py-[var(--space-3)] " +
  "text-[length:var(--text-body)] text-[var(--color-text)] outline-none " +
  "focus:border-[var(--color-border-strong)]";

function WebinarForm({
  row,
  onDone,
  pending,
  submit,
}: {
  row?: WebinarAdminRow;
  onDone: () => void;
  pending: boolean;
  submit: (fd: FormData) => void;
}) {
  const when = row ? isoToKyivParts(row.starts_at) : null;

  return (
    <form
      action={submit}
      className="mt-[var(--space-3)] grid gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-deep)] p-[var(--space-4)] sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={row?.webinar_id ?? ""} />

      <div className="sm:col-span-2">
        <Field label="Тема ефіру">
          <Input
            name="title"
            required
            minLength={2}
            defaultValue={row?.title ?? ""}
            placeholder="Як читати стіл за перші тридцять секунд"
          />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field
          label="Опис"
          hint="Два-три рядки про те, що розберемо. Видно в кабінеті."
        >
          <textarea
            name="description"
            rows={3}
            defaultValue={row?.description ?? ""}
            className={FIELD_CLASS}
          />
        </Field>
      </div>

      <Field label="Дата" hint="Київський час">
        <Input
          type="date"
          name="date"
          required
          defaultValue={when?.date ?? ""}
        />
      </Field>

      <Field label="Початок">
        <Input
          type="time"
          name="time"
          required
          defaultValue={when?.time ?? "19:00"}
        />
      </Field>

      <Field label="Тривалість, хв">
        <Input
          type="number"
          name="duration_min"
          min={10}
          max={240}
          defaultValue={row?.duration_min ?? 60}
        />
      </Field>

      <Field label="Посилання на ефір" hint="Zoom або Meet, https://">
        <Input
          type="url"
          name="join_url"
          defaultValue={row?.join_url ?? ""}
          placeholder="https://us06web.zoom.us/j/..."
        />
      </Field>

      <div className="sm:col-span-2">
        <Field
          label="Посилання на запис"
          hint="Додається після ефіру. Доки порожнє — в кабінеті написано «запис готується»."
        >
          <Input
            type="url"
            name="recording_url"
            defaultValue={row?.recording_url ?? ""}
          />
        </Field>
      </div>

      <label className="flex items-center gap-[var(--space-3)] sm:col-span-2">
        <input
          type="checkbox"
          name="published"
          defaultChecked={row?.is_published ?? false}
          className="h-5 w-5 shrink-0"
        />
        <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Опублікувати — вебінар одразу видно всім закладам із діючим
          доступом
        </span>
      </label>

      <div className="flex gap-[var(--space-2)] sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Зберігаю…" : "Зберегти"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}

export function WebinarEditor({ rows }: { rows: WebinarAdminRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [state, setState] = useState<SuResult | null>(null);
  const [pending, startTransition] = useTransition();

  function save(fd: FormData) {
    startTransition(async () => {
      const result = await saveWebinar(fd);
      setState(result);
      if (result.ok) {
        setEditing(null);
        setCreating(false);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      setState(await deleteWebinar(id));
      setConfirmId(null);
    });
  }

  const published = rows.filter((r) => r.is_published).length;

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
          <div>
            <Label>Розклад</Label>
            <p className="mt-[var(--space-1)] text-[var(--color-text-secondary)]">
              {rows.length === 0
                ? "Жодного вебінара. Річна ціна тримається на цьому розкладі."
                : `${rows.length} в базі, ${published} опубліковано`}
            </p>
          </div>
          {!creating && (
            <Button onClick={() => setCreating(true)}>Новий вебінар</Button>
          )}
        </div>

        {creating && (
          <WebinarForm
            onDone={() => setCreating(false)}
            pending={pending}
            submit={save}
          />
        )}
      </Card>

      {rows.map((row) => {
        const touched = row.touched_live + row.touched_recording;
        return (
          <Card key={row.webinar_id}>
            <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <Label>{formatWebinarDateTime(row.starts_at)}</Label>
                  {!row.is_published && (
                    <span className="rounded-[var(--radius-full)] bg-[var(--color-warning-soft)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)] text-[var(--color-warning)]">
                      чернетка
                    </span>
                  )}
                  {!row.recording_url && (
                    <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-muted)]">
                      без запису
                    </span>
                  )}
                </div>
                <h2 className="mt-[var(--space-2)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
                  {row.title}
                </h2>
                <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                  Відкривали: {row.touched_live} на ефірі ·{" "}
                  {row.touched_recording} у записі
                </p>
              </div>

              <div className="flex shrink-0 gap-[var(--space-2)]">
                <Button
                  variant="neutral"
                  onClick={() =>
                    setEditing(editing === row.webinar_id ? null : row.webinar_id)
                  }
                >
                  {editing === row.webinar_id ? "Згорнути" : "Редагувати"}
                </Button>

                {/* Deleting a webinar people opened would erase it from
                    their report too. Unpublishing is the way to retire
                    one — the editor simply stops offering delete. */}
                {touched === 0 &&
                  (confirmId === row.webinar_id ? (
                    <>
                      <Button
                        variant="danger"
                        disabled={pending}
                        onClick={() => remove(row.webinar_id)}
                      >
                        Точно видалити
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmId(null)}
                      >
                        Ні
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => setConfirmId(row.webinar_id)}
                    >
                      Видалити
                    </Button>
                  ))}
              </div>
            </div>

            {editing === row.webinar_id && (
              <WebinarForm
                row={row}
                onDone={() => setEditing(null)}
                pending={pending}
                submit={save}
              />
            )}
          </Card>
        );
      })}

      <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
        «Відкривали» рахує {TOUCH_MEANING}. Скільки людина насправді
        додивилась, платформа не знає — зовнішній Zoom і зовнішній запис
        такого сигналу не дають.
      </p>
    </div>
  );
}
