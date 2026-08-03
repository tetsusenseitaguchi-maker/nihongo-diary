"use client";

import { useState } from "react";
import { NativeGate } from "@/components/NativeGate";
import { Furigana } from "@/components/Furigana";
import { useT, useLocale } from "@/contexts/locale";
import { buildRubyNotation } from "@/lib/furigana";

/**
 * "How do I say this?" — an English word in, a Japanese one out, dropped into
 * the diary at the cursor.
 *
 * ── Where the idea comes from ────────────────────────────────────────────
 * The gap this fills is the one a beginner does not climb out of. Production
 * says 174 learners wrote exactly one diary and stopped, and the median diary
 * is 67 characters — the length of someone who ran out of words rather than
 * things to say. Reaching for a dictionary means leaving the page.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 * It never edits the diary by itself. The result sits there until the learner
 * taps it, and what gets inserted is the plain Japanese — kanji as normally
 * written, no ruby markup. The reading is shown here, above the text, and
 * deliberately not put into the diary: original_text is what /api/correct
 * reads, and 漢字(かな) inside it would be the learner's own writing with
 * something else mixed in.
 *
 * ── Free ─────────────────────────────────────────────────────────────────
 * Works on every plan. The daily cap (twenty new words — see
 * word-lookup-limits.ts) is not shown until it is nearly spent: a counter on
 * screen from the first lookup teaches hesitation, which is the opposite of
 * what this is for. Cache hits do not count at all, so twenty is twenty words
 * nobody has asked for yet.
 */

type Result = {
  japanese: string;
  reading: string | null;
  meaning: string;
  level: string | null;
  cached: boolean;
};

export function WordLookup({ onInsert }: { onInsert: (text: string) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  async function lookup() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/word-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, language: locale }),
      });
      if (res.status === 429) {
        setLimitReached(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(t("wordLookup.failed"));
        setLoading(false);
        return;
      }
      setResult((await res.json()) as Result);
    } catch {
      setError(t("wordLookup.networkError"));
    }
    setLoading(false);
  }

  return (
    <div className="mb-3 rounded-xl border border-line bg-paper/70 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm" aria-hidden>
          🔎
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void lookup();
            }
          }}
          placeholder={t("wordLookup.placeholder")}
          aria-label={t("wordLookup.placeholder")}
          className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void lookup()}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-full bg-pine px-3 py-1 text-xs font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? t("wordLookup.searching") : t("wordLookup.search")}
        </button>
      </div>

      {/* The answer. One word, tappable — the tap is the whole interaction, so
          the whole row is the target rather than a separate "insert" button. */}
      {result && (
        <button
          type="button"
          onClick={() => {
            onInsert(result.japanese);
            setResult(null);
            setQuery("");
          }}
          className="mt-2.5 flex w-full flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg bg-mint/40 px-3 py-2 text-left transition-colors hover:bg-mint/70"
        >
          <span className="font-jp text-[17px] font-semibold text-pine">
            {result.reading ? (
              <Furigana text={buildRubyNotation(result.japanese, result.reading)} />
            ) : (
              result.japanese
            )}
          </span>
          <span className="text-xs text-ink/70">{result.meaning}</span>
          {result.level && (
            <span className="rounded-full bg-pine px-2 py-0.5 text-[10px] font-bold text-cream">
              {result.level}
            </span>
          )}
          <span className="ml-auto text-[11px] font-semibold text-moss-600">
            {t("wordLookup.tapToInsert")}
          </span>
        </button>
      )}

      {error && <p className="mt-2 text-xs text-apricot">{error}</p>}

      {/* Only once it is actually gone. Naming the plans is web-only —
          App Store guideline 3.1.1, the same treatment audio.moreOnPaid gets. */}
      {limitReached && (
        <div className="mt-2">
          <p className="text-xs text-muted">{t("wordLookup.limitReached")}</p>
          <NativeGate>
            <p className="mt-0.5 text-xs text-muted">{t("wordLookup.moreOnPaid")}</p>
          </NativeGate>
        </div>
      )}
    </div>
  );
}
