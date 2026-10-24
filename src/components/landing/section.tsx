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
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-[4rem] px-[var(--space-4)]",
        "py-[var(--space-section)] md:py-[var(--space-section-lg)]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[72rem]">{children}</div>
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
}: {
  label: string;
  title: string;
  lead?: React.ReactNode;
  labelTone?: "muted" | "accent";
}) {
  return (
    <header className="mb-[var(--space-8)] max-w-[44rem]">
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
      <h2 className="mt-[var(--space-3)] text-[length:var(--text-h1)] font-[var(--weight-bold)] md:text-[2.25rem]">
        {title}
      </h2>
      {lead && (
        <p className="mt-[var(--space-4)] text-[var(--color-text-secondary)]">
          {lead}
        </p>
      )}
    </header>
  );
}
