import * as React from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "accent" | "neutral" | "ghost" | "danger";
  full?: boolean;
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] " +
  "px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-body)] " +
  "font-[var(--weight-semibold)] transition-colors " +
  "duration-[var(--duration-fast)] disabled:opacity-50 " +
  "disabled:cursor-not-allowed cursor-pointer";

const BUTTON_VARIANTS: Record<string, string> = {
  accent:
    "bg-[var(--color-accent)] text-[var(--color-text-on-accent)] " +
    "hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-pressed)]",
  neutral:
    "bg-[var(--color-surface-raised)] text-[var(--color-text)] " +
    "border border-[var(--color-border)] hover:bg-[var(--color-surface)]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] " +
    "hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]",
  danger:
    "bg-transparent text-[var(--color-danger)] " +
    "border border-[var(--color-border)] hover:bg-[var(--color-danger-soft)]",
};

export function Button({
  variant = "accent",
  full,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        full && "w-full",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Input + Field                                                       */
/* ------------------------------------------------------------------ */

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]",
        "border border-[var(--color-border)] px-[var(--space-4)]",
        // 16px base: anything smaller and iOS zooms the page on focus.
        "py-[var(--space-3)] text-[length:var(--text-body)]",
        "text-[var(--color-text)] outline-none",
        "focus:border-[var(--color-border-strong)]",
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[var(--space-2)]">
      <span className="text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[var(--color-text-secondary)]">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-[length:var(--text-sm)] text-[var(--color-danger)]">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)]",
        "bg-[var(--color-surface)] p-[var(--space-6)]",
        className,
      )}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
      {children}
    </span>
  );
}

const ALERT_TONES: Record<string, string> = {
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
};

export function Alert({
  tone = "info",
  children,
}: {
  tone?: keyof typeof ALERT_TONES;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)]",
        "text-[length:var(--text-sm)]",
        ALERT_TONES[tone],
      )}
    >
      {children}
    </div>
  );
}

/** Page shell for the phone-first screens. */
export function Screen({
  children,
  width = "narrow",
}: {
  children: React.ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-[var(--space-4)] py-[var(--space-8)]",
        width === "narrow" ? "max-w-[28rem]" : "max-w-[64rem]",
      )}
    >
      {children}
    </main>
  );
}
