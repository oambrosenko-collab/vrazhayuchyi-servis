"use client";

import * as React from "react";

/**
 * The strip that rides up over the bottom of the hero.
 *
 * Lifted from the reference: a panel that straddles two sections stitches
 * them together and stops the page reading as a stack of equal bands. It
 * carries the four things a restaurateur is actually buying, so the first
 * scroll answers "what is this" before the argument starts.
 *
 * The icons are drawn here rather than pulled from a set: the project has
 * no icon dependency, and four line glyphs on a shared 24-grid with one
 * stroke weight are cheaper than adding one. They are periwinkle, not
 * accent — four orange marks beside the hero's button would take the one
 * accent off it.
 */
const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      aria-hidden
      className="text-[var(--color-periwinkle)]"
      {...STROKE}
    >
      {children}
    </svg>
  );
}

/** A lesson: video in a frame. */
const CourseIcon = (
  <Glyph>
    <rect x="3" y="4" width="18" height="16" rx="4" />
    <path d="M10.5 9.5l4.5 2.5-4.5 2.5z" />
  </Glyph>
);

/** A month: a calendar with one date marked. */
const WebinarIcon = (
  <Glyph>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
    <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
  </Glyph>
);

/** A report: bars on a baseline. */
const ReportIcon = (
  <Glyph>
    <path d="M3 21h18" />
    <path d="M7.5 21v-7M12 21V7M16.5 21v-4.5" />
  </Glyph>
);

/** Reuse: a closed cycle. */
const ReuseIcon = (
  <Glyph>
    <path d="M4.5 10.5A7.5 7.5 0 0 1 17 6.6L19.5 9" />
    <path d="M19.5 13.5A7.5 7.5 0 0 1 7 17.4L4.5 15" />
    <path d="M19.5 4.5V9h-4.5" />
    <path d="M4.5 19.5V15H9" />
  </Glyph>
);

const ITEMS = [
  {
    icon: CourseIcon,
    title: "Вхідний курс",
    body: "Нові працівники з перших змін працюють у тій самій манері турботи, що й уся команда",
  },
  {
    icon: WebinarIcon,
    title: "Щомісячні вебінари",
    body: "Дванадцять зустрічей на рік, на яких команда опановує нові прийоми турботи про гостя",
  },
  {
    icon: ReportIcon,
    title: "Звітність",
    body: "Видно, хто тримає рівень, а в кого враження від обслуговування почало згасати",
  },
  {
    icon: ReuseIcon,
    title: "Перевикористання місць",
    body: "Місце закріплене за закладом і переходить наступному працівнику без доплат",
  },
];

export function Highlights() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  React.useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // Same reasoning as `Section`: `revealed` is only read to skip setup
    // when prefers-reduced-motion already resolved it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    /* Straddling the seam, not sitting below it.
     *
     * From `lg` the wrapper is zero-height, so the next section starts
     * exactly at the hero's bottom edge and its hairline runs through the
     * middle of this panel — the panel covers the middle of that line and
     * leaves it visible left and right, which is what makes the strip read
     * as laid across the seam rather than parked under it.
     *
     * The shift is `-translate-y-1/2`, half the element's own height,
     * because that height changes with the copy and with the breakpoint;
     * any fixed number here would drift the moment a line wraps.
     *
     * Below `lg` the panel stacks four rows tall and half of it would
     * bury the next heading, so there it keeps a modest overlap and stays
     * in flow.
     *
     * The entrance animation lives on this innermost grid, not on either
     * wrapper above: those two carry the static `-translate-y-1/2` seam
     * positioning, and animating that same property here would fight it.
     * A transform on this box composes independently of its ancestors', so
     * it can slide up from below on its own without touching the seam
     * math. */
    <div className="relative z-10 -mt-[var(--space-12)] px-[var(--space-4)] md:-mt-[var(--space-16)] lg:mt-0 lg:h-0">
      <div className="mx-auto w-full max-w-[96rem] lg:-translate-y-1/2">
        <div
          ref={ref}
          className={
            "grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-4 " +
            "transition-all duration-700 ease-out " +
            (revealed
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-[2.5rem]")
          }
        >
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center bg-[var(--color-surface)] p-[var(--space-6)] text-center"
            >
              {item.icon}
              <h2 className="mt-[var(--space-4)] text-[length:var(--text-h3)] font-[var(--weight-semibold)]">
                {item.title}
              </h2>
              <p className="mt-[var(--space-2)] max-w-[17rem] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
