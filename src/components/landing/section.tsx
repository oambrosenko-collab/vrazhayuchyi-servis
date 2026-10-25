"use client";

import * as React from "react";
import { cn } from "@/components/ui";

/**
 * Section shell for the landing.
 *
 * The app shell (`Screen`) caps at 64rem because it was drawn for a phone
 * and for tables that stay readable. The landing needs more: three pricing
 * cards and the product screenshots both break down below 72rem on desktop.
 *
 * `scroll-mt` exists because the header is sticky — without it an anchor
 * jump parks the heading underneath the header.
 *
 * Every section fades and lifts into place the first time it crosses into
 * view — `IntersectionObserver` rather than a scroll listener, so the
 * cost is one callback per section instead of one per scroll event. It
 * fires once (`observer.disconnect()` on entry) and is skipped under
 * `prefers-reduced-motion`. The server-rendered markup starts at
 * `opacity-0` before hydration, same as every scroll-reveal pattern of
 * this kind — a visitor with JavaScript disabled would not see the
 * sections at all, which this landing accepts given the app behind it is
 * already JS-dependent end to end (magic-link auth, the client-rendered
 * dashboards).
 */
export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLElement>(null);
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
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // `revealed` is read only to skip setup when the lazy initializer
    // already resolved it via prefers-reduced-motion — re-running this
    // effect on every reveal would tear down and recreate the observer
    // for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "scroll-mt-[4rem] px-[var(--space-4)]",
        "py-[var(--space-section)] md:py-[var(--space-section-lg)]",
        "transition-all duration-700 ease-out",
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[1.5rem]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[96rem]">{children}</div>
    </section>
  );
}

/**
 * Restrained label + heading, per rule 3 of the mood rules in the tokens.
 *
 * The label can take the accent: the reference colours its section
 * eyebrows in the brand hue, and a 12px caps line is a mark rather than an
 * object, so it does not spend the one accent a screen is allowed. `lead`
 * accepts nodes so a section can colour a phrase inside it.
 */
export function SectionHead({
  label,
  title,
  lead,
  labelTone = "muted",
  align = "left",
}: {
  label: string;
  title: string;
  lead?: React.ReactNode;
  labelTone?: "muted" | "accent";
  align?: "left" | "center";
}) {
  return (
    <header
      className={cn(
        "mb-[50px] max-w-[44rem]",
        align === "center" && "mx-auto text-center",
      )}
    >
      <span
        className={cn(
          "text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)]",
          labelTone === "accent"
            ? "font-[var(--weight-semibold)] text-[var(--color-accent)]"
            : "text-[var(--color-text-secondary)]",
        )}
      >
        {label}
      </span>
      <h2 className="mt-[var(--space-3)] text-[length:var(--text-h1)] font-[var(--weight-bold)] leading-[1] md:text-[2.25rem]">
        {title}
      </h2>
      {lead && (
        <p className="mt-[50px] text-[var(--color-text-secondary)]">
          {lead}
        </p>
      )}
    </header>
  );
}
