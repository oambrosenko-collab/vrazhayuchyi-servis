/**
 * The linear form of the same idea: one ratio against a limit.
 *
 * Used where a second ring would compete with the first — one circle per
 * screen is what keeps the reference calm. Rounded ends, hairline track,
 * value always written out beside the label so the bar never carries the
 * number alone.
 */
type Tone = "accent" | "warning" | "neutral";

const FILL: Record<Tone, string> = {
  accent: "var(--color-accent)",
  warning: "var(--color-warning)",
  neutral: "var(--color-periwinkle)",
};

const TRACK: Record<Tone, string> = {
  accent: "var(--color-accent-soft)",
  warning: "var(--color-warning-soft)",
  neutral: "var(--color-periwinkle-soft)",
};

export function Meter({
  label,
  value,
  max,
  valueText,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  max: number;
  valueText: string;
  hint?: string;
  tone?: Tone;
}) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-[var(--space-4)]">
        <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          {label}
        </span>
        <span className="shrink-0 font-[var(--weight-semibold)] text-[var(--color-text)]">
          {valueText}
        </span>
      </div>

      <div
        className="mt-[var(--space-2)] h-[8px] w-full overflow-hidden rounded-[var(--radius-full)]"
        style={{ background: TRACK[tone] }}
        role="img"
        aria-label={`${label}: ${valueText}`}
      >
        <div
          className="h-full rounded-[var(--radius-full)] transition-[width] duration-[var(--duration-base)]"
          style={{ width: `${ratio * 100}%`, background: FILL[tone] }}
        />
      </div>

      {hint && (
        <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
    </div>
  );
}
