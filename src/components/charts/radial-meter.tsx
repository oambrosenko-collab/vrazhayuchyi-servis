/**
 * A ratio against a limit, drawn as the reference's 270° arc.
 *
 * Not a pie and not a one-bar chart: the question is «скільки з
 * дозволеного вибрано», and a meter answers it in one glance. The unfilled
 * track is the soft step of the same colour, so the state reads across the
 * whole ring rather than only where the fill ends.
 *
 * The number inside is the hero figure: body sans, proportional figures.
 * `tabular-nums` would make a value like 14 look loose at this size, and a
 * display face would read as decoration.
 */
const SIZE = 148;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Three quarters of the circle, gap at the bottom — as in the reference. */
const SWEEP = 0.75;

type Tone = "accent" | "warning" | "danger" | "neutral";

const FILL: Record<Tone, string> = {
  accent: "var(--color-accent)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  neutral: "var(--color-periwinkle)",
};

const TRACK: Record<Tone, string> = {
  accent: "var(--color-accent-soft)",
  warning: "var(--color-warning-soft)",
  danger: "var(--color-danger-soft)",
  neutral: "var(--color-periwinkle-soft)",
};

export function RadialMeter({
  value,
  max,
  caption,
  valueText,
  tone = "accent",
  title,
}: {
  value: number;
  max: number;
  /** Short line under the number. */
  caption: string;
  /** Overrides the big number when the ratio is not what to show. */
  valueText?: string;
  tone?: Tone;
  /** Read out to screen readers in place of the drawing. */
  title: string;
}) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={title}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={TRACK[tone]}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${SWEEP * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform={`rotate(135 ${CENTER} ${CENTER})`}
          />
          {ratio > 0 && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={FILL[tone]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${ratio * SWEEP * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              transform={`rotate(135 ${CENTER} ${CENTER})`}
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[3rem] leading-[var(--leading-tight)] font-[var(--weight-bold)] text-[var(--color-text)]">
            {valueText ?? `${Math.round(ratio * 100)}%`}
          </span>
        </div>
      </div>

      <p className="mt-[var(--space-2)] text-center text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        {caption}
      </p>
    </div>
  );
}
