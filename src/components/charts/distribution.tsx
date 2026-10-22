/**
 * Where the team actually is, in four ordered buckets.
 *
 * The average alone hides the shape: «середній прогрес 48%» looks the same
 * whether everyone is halfway or half the team never started. These bins
 * are an ordered scale, so they get one hue stepped by brightness — on a
 * dark surface the ramp runs dim → bright, not light → dark.
 *
 * Every row is direct-labelled with its count: the colour carries order,
 * never the value.
 */
export type Bin = { label: string; count: number };

/** Dim → bright over the same hue. Index is the bucket's rank, not its size. */
// Floor at 0.45: below that the dimmest step drops under 3:1 on this
// surface, and the row would lean on its text label alone.
const STEPS = [0.45, 0.63, 0.82, 1];

export function Distribution({
  bins,
  total,
  empty,
}: {
  bins: Bin[];
  total: number;
  /** Shown instead of empty bars when nobody has joined yet. */
  empty: string;
}) {
  if (total === 0) {
    return (
      <p className="py-[var(--space-4)] text-[var(--color-text-secondary)]">
        {empty}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-[var(--space-3)]">
      {bins.map((bin, i) => {
        const ratio = bin.count / total;
        return (
          <li key={bin.label} className="flex items-center gap-[var(--space-3)]">
            <span className="w-[8.5rem] shrink-0 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {bin.label}
            </span>

            <div className="h-[10px] min-w-0 flex-1 rounded-[var(--radius-full)] bg-[var(--color-surface-raised)]">
              {bin.count > 0 && (
                <div
                  className="h-full rounded-[var(--radius-full)]"
                  style={{
                    width: `${Math.max(ratio * 100, 2)}%`,
                    background: "var(--color-periwinkle)",
                    opacity: STEPS[Math.min(i, STEPS.length - 1)],
                  }}
                />
              )}
            </div>

            <span className="w-[2.5rem] shrink-0 text-right font-[family-name:var(--font-mono)] text-[length:var(--text-sm)] text-[var(--color-text)]">
              {bin.count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
