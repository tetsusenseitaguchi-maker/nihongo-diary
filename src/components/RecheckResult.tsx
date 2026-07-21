"use client";

import type { CSSProperties } from "react";
import type { RecheckResult as RecheckResultData } from "@/lib/types";
import { Furigana } from "@/components/Furigana";
import { ObiePhoto } from "@/components/ObiePhoto";
import { useT } from "@/contexts/locale";

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

/**
 * Renders the lightweight diff feedback from the revise & recheck flow:
 * "what got fixed" (fixed) and "what still needs work" (remaining).
 * Purely presentational — receives the already-sanitized RecheckResult.
 */
export function RecheckResult({ result }: { result: RecheckResultData }) {
  const t = useT();
  const nothingLeft = result.remaining.length === 0;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {result.summary && (
        <div className="gloss-panel rounded-[var(--radius-card)] p-5" style={tint("--color-tint-sage")}>
          <p className="text-sm leading-relaxed text-ink/85">🌱 {result.summary}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Fixed points */}
        <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-green")}>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-pine">
            ✓ {t("recheck.fixedTitle")}
          </p>
          {result.fixed.length === 0 ? (
            <p className="text-sm text-ink/70">{t("recheck.noFixed")}</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {result.fixed.map((f, i) => (
                <li key={i} className="rounded-xl bg-paper/60 p-3">
                  <span className="font-semibold text-pine">{f.point}</span>
                  {f.detail && <span className="mt-0.5 block text-ink/70">{f.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Remaining points */}
        <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sand")}>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-apricot">
            ⚠ {t("recheck.remainingTitle")}
          </p>
          {nothingLeft ? (
            <p className="text-sm text-ink/70">
              <Furigana text={t("recheck.noRemaining")} />
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {result.remaining.map((r, i) => (
                <li key={i} className="rounded-xl bg-paper/60 p-3">
                  <span className="font-semibold text-ink/85">{r.point}</span>
                  {(r.quoteRuby || r.suggestionRuby) && (
                    <span className="mt-1 block">
                      {r.quoteRuby && (
                        <Furigana text={r.quoteRuby} className="font-jp text-ink/45 line-through" />
                      )}
                      {r.quoteRuby && r.suggestionRuby && <span className="mx-1.5 text-moss">→</span>}
                      {r.suggestionRuby && (
                        <Furigana text={r.suggestionRuby} className="font-jp font-semibold text-pine" />
                      )}
                    </span>
                  )}
                  {r.detail && <span className="mt-0.5 block text-ink/65">{r.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Obie encouragement */}
      {result.encouragementRuby && (
        <div className="gloss-green flex items-start gap-3 rounded-[var(--radius-card)] p-5">
          <ObiePhoto size={44} className="shrink-0 ring-2 ring-cream/25" />
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cream/70">
              🐾 {t("recheck.obieTitle")}
            </p>
            <p className="font-jp text-[15px] font-medium leading-relaxed text-cream">
              <Furigana text={result.encouragementRuby} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
