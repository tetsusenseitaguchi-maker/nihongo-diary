"use client";

import { type CSSProperties } from "react";
import { Furigana } from "@/components/Furigana";
import { useT } from "@/contexts/locale";
import type { MistakeItem } from "@/lib/types";

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

export function GrammarReviewCard({ item }: { item: MistakeItem }) {
  const t = useT();
  return (
    <div
      className="gloss-panel rounded-[var(--radius-card)] p-4"
      style={tint("--color-tint-sage")}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🌱</span>
        <h3 className="text-sm font-bold text-pine">{t("review.title")}</h3>
      </div>
      <p className="mb-2 text-xs text-ink/60">{t("review.prompt")}</p>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-paper/60 px-3 py-2.5 font-jp text-sm">
        <span className="text-ink/50 line-through">
          <Furigana text={item.before} />
        </span>
        <span className="font-bold text-moss-600">→</span>
        <span className="font-semibold text-pine">
          <Furigana text={item.after} />
        </span>
      </div>
      {item.note && (
        <p className="mt-2 text-xs leading-relaxed text-ink/70">{item.note}</p>
      )}
      <p className="mt-3 text-xs font-medium text-pine/80">{t("review.cta")}</p>
    </div>
  );
}
