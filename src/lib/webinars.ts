import type { FunctionReturns } from "@/lib/supabase/types";

export type WebinarRow = FunctionReturns<"webinar_feed">;

/**
 * Every time on these screens is Kyiv time, pinned.
 *
 * The product serves one market and the PRD says so. Without the pin the
 * server renders in its own zone — Vercel runs UTC — and a broadcast at
 * 19:00 shows up as 16:00 for everyone, including the person who is
 * supposed to join it.
 */
const TZ = "Europe/Kyiv";

const DATE_TIME = new Intl.DateTimeFormat("uk-UA", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_ONLY = new Intl.DateTimeFormat("uk-UA", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
});

const TIME_ONLY = new Intl.DateTimeFormat("uk-UA", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

/** "вівторок, 18 листопада, 19:00" */
export function formatWebinarDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatWebinarDate(iso: string): string {
  return DATE_ONLY.format(new Date(iso));
}

export function formatWebinarTime(iso: string): string {
  return TIME_ONLY.format(new Date(iso));
}

/** Calendar day in Kyiv, so "сьогодні" means the same thing to everyone. */
function kyivDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/**
 * "сьогодні о 19:00", "завтра", "через 3 дні", "18 листопада".
 *
 * Counted in calendar days rather than in hours: a broadcast tonight and
 * one in twenty-three hours are not the same thing to someone planning
 * their shift.
 */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const start = new Date(iso);
  const today = kyivDay(now);
  const day = kyivDay(start);

  if (day === today) return `сьогодні о ${formatWebinarTime(iso)}`;

  const tomorrow = kyivDay(new Date(now.getTime() + 86_400_000));
  if (day === tomorrow) return `завтра о ${formatWebinarTime(iso)}`;

  const days = Math.round(
    (new Date(day + "T00:00:00Z").getTime() -
      new Date(today + "T00:00:00Z").getTime()) /
      86_400_000,
  );

  if (days > 1 && days < 5) return `через ${days} дні`;
  if (days >= 5 && days < 14) return `через ${days} днів`;
  return formatWebinarDate(iso);
}

export type WebinarFeed = {
  /** Soonest first — the opposite of the archive. */
  upcoming: WebinarRow[];
  past: WebinarRow[];
};

export function splitFeed(rows: WebinarRow[]): WebinarFeed {
  const upcoming = rows
    .filter((r) => r.is_upcoming)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Already ordered newest-first by the RPC.
  const past = rows.filter((r) => !r.is_upcoming);

  return { upcoming, past };
}

/**
 * What the owner's report means by the webinar column.
 *
 * Used as the header hint and in the CSV, in one place, because the whole
 * honesty of that number rests on the wording being the same everywhere.
 */
export const TOUCH_MEANING =
  "перехід на ефір або відкриття запису з кабінету";

/** "2 з 3" — or a dash when nothing was held while the person was here. */
export function formatTouched(touched: number, held: number): string {
  if (held === 0) return "—";
  return `${touched} з ${held}`;
}

/* ------------------------------------------------------------------ */
/* Wall clock ↔ instant                                                */
/*                                                                     */
/* The editor types "18.11 о 19:00" meaning Kyiv, and the column is a  */
/* timestamptz. Neither the browser's zone nor the server's can be     */
/* trusted to be Kyiv — Vercel runs UTC — so the conversion is done    */
/* explicitly in both directions.                                      */
/* ------------------------------------------------------------------ */

/** Minutes Kyiv is ahead of UTC at that instant. +120 or +180. */
function kyivOffsetMinutes(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - at.getTime()) / 60_000;
}

/**
 * "2026-11-18" + "19:00" as Kyiv wall clock → the matching UTC instant.
 *
 * Two passes: the offset depends on the instant, and the instant depends
 * on the offset. One correction is enough everywhere except inside the
 * hour that DST skips, which no webinar will be scheduled in.
 */
export function kyivWallClockToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const naive = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(naive)) return null;

  let instant = naive;
  for (let i = 0; i < 2; i++) {
    instant = naive - kyivOffsetMinutes(new Date(instant)) * 60_000;
  }

  return new Date(instant).toISOString();
}

/** The inverse, for filling the editor's date and time inputs. */
export function isoToKyivParts(iso: string): { date: string; time: string } {
  const at = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  return { date, time };
}
