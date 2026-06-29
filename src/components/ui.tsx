import Link from "next/link";
import type { ReactNode } from "react";

/* ----------------------------- Button ----------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "gloss-btn text-cream hover:shadow-lift hover:brightness-105 active:brightness-95",
  secondary:
    "gloss bg-paper text-pine border border-line hover:border-moss hover:bg-mint/40 shadow-card",
  ghost: "text-pine hover:bg-mint/60",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

interface ButtonBase {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonBase & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: ButtonBase & { href: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ------------------------------ Card ------------------------------ */

type CardAccent = "pine" | "apricot" | "none";

export function Card({
  className = "",
  accent = "pine",
  children,
}: {
  className?: string;
  accent?: CardAccent;
  children: ReactNode;
}) {
  const accentClass =
    accent === "pine"
      ? "border-l-[3px] border-l-pine"
      : accent === "apricot"
        ? "border-l-[3px] border-l-apricot"
        : "";
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line bg-paper shadow-card ${accentClass} ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Badge ----------------------------- */

export function Badge({
  children,
  tone = "moss",
  className = "",
}: {
  children: ReactNode;
  tone?: "moss" | "sand" | "apricot";
  className?: string;
}) {
  const tones = {
    moss: "bg-mint text-pine",
    sand: "bg-sand text-ink/70",
    apricot: "bg-apricot/15 text-apricot",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* --------------------------- SectionLabel ------------------------- */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-moss-600">
      <span className="h-px w-6 bg-moss/50" />
      {children}
    </span>
  );
}
