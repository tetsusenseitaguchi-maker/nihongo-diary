"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

/**
 * The way in to /dictation/[id]. Three places lead here — straight after a
 * correction (the write page), the diary detail page, and the history list —
 * so the wording and the icon live in one file rather than three.
 *
 * `variant` is about how much room the caller has, not about importance:
 *   card … a full-width panel with a line of explanation. For the two pages
 *          that have the vertical space and want this noticed.
 *   row  … a compact link for a list row.
 *
 * Deliberately NOT placed inside CorrectionResult, which renders in four
 * places including the tour. The write page decides for itself whether to show
 * this, so the tutorial cannot.
 */
export function DictationLink({
  diaryId,
  variant = "card",
}: {
  diaryId: string;
  variant?: "card" | "row";
}) {
  const t = useT();

  if (variant === "row") {
    return (
      <Link
        href={`/dictation/${diaryId}`}
        aria-label={t("dictation.cta")}
        title={t("dictation.cta")}
        className="grid h-9 w-9 place-items-center rounded-xl text-moss-600 transition-colors hover:bg-mint/60 hover:text-pine"
      >
        <Icon.speaker className="h-[18px] w-[18px]" />
      </Link>
    );
  }

  return (
    <Link
      href={`/dictation/${diaryId}`}
      className="gloss-panel flex items-center gap-4 rounded-[var(--radius-card)] p-5 transition-shadow hover:shadow-lift"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-pine">
        <Icon.speaker className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-base font-bold text-pine">
          {t("dictation.cta")}
        </span>
        <span className="block text-sm text-muted">{t("dictation.ctaHint")}</span>
      </span>
      <Icon.arrow className="h-5 w-5 shrink-0 text-moss-600" />
    </Link>
  );
}
