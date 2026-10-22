import type { FunctionReturns } from "@/lib/supabase/types";
import { formatTouched } from "@/lib/webinars";

export type TeamRow = FunctionReturns<"team_report">;

/** A week of silence is the point where the manager should step in. */
export const STUCK_AFTER_DAYS = 7;

export type TeamSummary = {
  active: TeamRow[];
  released: TeamRow[];
  /** Active people who have not watched anything for a week, or ever. */
  stuck: TeamRow[];
  /** Mean completion across active seats, rounded. 0 when nobody joined. */
  averagePercent: number;
  /** Active people who finished the whole course. */
  finished: number;
  /**
   * Active seats bucketed by how far they got. The average hides the
   * shape — half a team at 100% and half at zero averages to the same
   * number as everyone sitting at fifty.
   */
  bins: { label: string; count: number }[];
  /** Webinar touches against webinars held, summed over active seats. */
  webinarsTouched: number;
  webinarsHeld: number;
};

export function summarise(rows: TeamRow[]): TeamSummary {
  const active = rows.filter((r) => r.status === "active");
  const released = rows.filter((r) => r.status === "removed");

  const cutoff = Date.now() - STUCK_AFTER_DAYS * 86_400_000;
  const stuck = active.filter((r) => {
    // Never started is the worst case, not an exception to it: a seat
    // handed out and never used is exactly what kills renewal.
    if (!r.last_seen_at) return true;
    return new Date(r.last_seen_at).getTime() < cutoff;
  });

  const averagePercent =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce((sum, r) => sum + r.percent, 0) / active.length,
        );

  return {
    active,
    released,
    stuck,
    averagePercent,
    finished: active.filter(
      (r) => r.lessons_total > 0 && r.lessons_done >= r.lessons_total,
    ).length,
    bins: [
      {
        label: "Не починали",
        count: active.filter((r) => r.percent === 0).length,
      },
      {
        label: "До половини",
        count: active.filter((r) => r.percent > 0 && r.percent < 50).length,
      },
      {
        label: "Більше половини",
        count: active.filter((r) => r.percent >= 50 && r.percent < 100).length,
      },
      {
        label: "Завершили",
        count: active.filter((r) => r.percent >= 100).length,
      },
    ],
    webinarsTouched: active.reduce((n, r) => n + r.webinars_touched, 0),
    webinarsHeld: active.reduce((n, r) => n + r.webinars_held, 0),
  };
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "short" }).format(
    new Date(iso),
  );
}

/** "сьогодні", "3 дні тому", "ще не починав" — the report reads at a glance. */
export function formatSince(iso: string | null): string {
  if (!iso) return "ще не починав";

  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "сьогодні";
  if (days === 1) return "вчора";
  if (days < 5) return `${days} дні тому`;
  if (days < 31) return `${days} днів тому`;
  return formatDate(iso);
}

/**
 * CSV for the owner's own spreadsheet.
 *
 * Semicolons, not commas: Ukrainian Excel runs on a locale where the
 * comma is the decimal separator, and a comma-delimited file opens as one
 * column. The BOM is what stops Cyrillic arriving as mojibake.
 */
export function toCsv(rows: TeamRow[]): string {
  const head = [
    "Ім'я",
    "Пошта",
    "Статус",
    "Приєднався",
    "Пройдено уроків",
    "Усього уроків",
    "Відсоток",
    "Вебінари за 3 місяці",
    "Остання активність",
    "Звільнено",
  ];

  const cell = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  const lines = rows.map((r) =>
    [
      r.full_name,
      r.email,
      r.status === "active" ? "активний" : "звільнений",
      formatDate(r.joined_at),
      r.lessons_done,
      r.lessons_total,
      `${r.percent}%`,
      formatTouched(r.webinars_touched, r.webinars_held),
      r.last_seen_at ? formatDate(r.last_seen_at) : "не починав",
      formatDate(r.removed_at),
    ]
      .map(cell)
      .join(";"),
  );

  return "﻿" + [head.join(";"), ...lines].join("\r\n");
}
