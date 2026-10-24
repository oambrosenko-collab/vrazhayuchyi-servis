/**
 * The three hues the landing repeats, in the order the design tokens fix
 * for chart data: accent first, then the two complementary ones.
 *
 * Every set of three on the page draws from this list by index — the
 * figures under «Суть підходу», the numbered steps, the pillars of the
 * annual access, the points about turnover. Repetition is the point: the
 * same first colour in the same first position is what makes four
 * different sections read as one system instead of four decisions.
 *
 * The accent always lands on the first item, which is also the one that
 * carries the argument in each set.
 */
export const TRIO = [
  { color: "var(--color-accent)", soft: "var(--color-accent-soft)" },
  { color: "var(--color-periwinkle)", soft: "var(--color-periwinkle-soft)" },
  { color: "var(--color-mint)", soft: "var(--color-mint-soft)" },
];
