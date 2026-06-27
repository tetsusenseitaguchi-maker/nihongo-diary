"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { Furigana } from "@/components/Furigana";
import { useT } from "@/contexts/locale";
import { buildRubyNotation } from "@/lib/furigana";

type ReportData = {
  plan: string;
  daysWritten: number;
  weekStart: string;
  weekEnd: string;
  streak?: number;
  frequentWords?: Array<{ word: string; reading: string; count: number }>;
  mistakeNotes?: string[];
  aiSuggestions?: string[];
};

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

function fmtDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function WeeklyReport() {
  const t = useT();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isIosApp, setIsIosApp] = useState(false);

  useEffect(() => {
    const cap = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    setIsIosApp(cap.Capacitor?.isNativePlatform?.() === true);
  }, []);

  useEffect(() => {
    fetch("/api/report/weekly")
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pine border-t-transparent" />
        <p className="text-sm text-ink/60">{t("report.generating")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-ink/60">{t("report.error")}</p>
      </div>
    );
  }

  const isPlus = data.plan !== "free";

  return (
    <div className="space-y-5">
      {/* Week label */}
      <p className="text-sm text-ink/60">
        {t("report.weekOf", { start: fmtDate(data.weekStart), end: fmtDate(data.weekEnd) })}
      </p>

      {/* Days written */}
      <div className="flex items-center gap-5 rounded-[var(--radius-card)] bg-pine p-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10">
          <span className="text-3xl font-bold leading-none text-cream">{data.daysWritten}</span>
          <span className="mt-0.5 text-[10px] text-cream/60">/ 7</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-snug text-cream">
            {t("report.daysWritten", { n: data.daysWritten })}
          </p>
          {isPlus && !!data.streak && data.streak > 0 && (
            <p className="mt-1 text-sm text-cream/70">
              🔥 {t("report.streak", { n: data.streak })}
            </p>
          )}
        </div>
      </div>

      {!isPlus ? (
        /* Free plan: upgrade prompt */
        <div className="space-y-2 rounded-[var(--radius-card)] border border-line bg-paper p-6 text-center">
          <p className="text-2xl">📊</p>
          <p className="font-semibold text-ink/80">{t("report.upgradeTitle")}</p>
          <p className="text-sm text-ink/60">{t("report.upgradeDesc")}</p>
          {!isIosApp ? (
            <a
              href="/upgrade"
              className="mt-3 inline-block rounded-xl bg-pine px-5 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90"
            >
              {t("report.upgradeBtn")}
            </a>
          ) : (
            <p className="mt-2 text-xs text-ink/50">{t("report.upgradeIos")}</p>
          )}
        </div>
      ) : data.daysWritten === 0 ? (
        /* Plus but no entries this week */
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line py-14 text-center">
          <span className="text-3xl">📅</span>
          <p className="font-semibold text-ink/70">{t("report.noEntries")}</p>
          <p className="text-sm text-ink/50">{t("report.noEntriesHint")}</p>
        </div>
      ) : (
        <>
          {/* Frequent vocabulary */}
          {data.frequentWords && data.frequentWords.length > 0 && (
            <section
              className="gloss-panel rounded-[var(--radius-card)] p-5"
              style={tint("--color-tint-sage")}
            >
              <h3 className="mb-3 text-sm font-bold text-pine">{t("report.frequentWords")}</h3>
              <div className="flex flex-wrap gap-2">
                {data.frequentWords.map((w, i) => (
                  <span
                    key={i}
                    className="rounded-xl bg-paper/70 px-3 py-1.5 font-jp text-sm font-semibold text-pine"
                  >
                    <Furigana text={buildRubyNotation(w.word, w.reading)} />
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Mistake patterns */}
          <section
            className="gloss-panel rounded-[var(--radius-card)] p-5"
            style={tint("--color-tint-sand")}
          >
            <h3 className="mb-3 text-sm font-bold text-pine">{t("report.mistakePatterns")}</h3>
            {data.mistakeNotes && data.mistakeNotes.length > 0 ? (
              <ul className="space-y-2">
                {data.mistakeNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink/80">
                    <span className="mt-0.5 shrink-0 text-moss-600">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/60">{t("report.noMistakes")}</p>
            )}
          </section>

          {/* AI suggestions */}
          {data.aiSuggestions && data.aiSuggestions.length > 0 && (
            <section
              className="gloss-panel rounded-[var(--radius-card)] p-5"
              style={tint("--color-tint-blue")}
            >
              <h3 className="mb-3 text-sm font-bold text-pine">{t("report.aiSuggestions")}</h3>
              <ul className="space-y-3">
                {data.aiSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl bg-paper/60 px-3 py-2.5"
                  >
                    <span className="mt-0.5 shrink-0 font-bold text-moss-600">{i + 1}.</span>
                    <span className="text-sm text-ink/80">{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
