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

/** Restrained label + heading, per rule 3 of the mood rules in the tokens. */
export function SectionHead({
  label,
  title,
  lead,
}: {
  label: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="mb-[var(--space-8)] max-w-[44rem]">
      <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
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
