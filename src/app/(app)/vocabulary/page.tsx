"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { Furigana } from "@/components/Furigana";
import { useT } from "@/contexts/locale";
import { buildRubyNotation } from "@/lib/furigana";

type VocabEntry = {
  id: string;
  word: string;
  reading: string;
  jlpt_level: string | null;
  meaning: string;
  example_jp_ruby: string | null;
  example_translation: string | null;
  practice_question: string | null;
  practice_answer: string | null;
  created_at: string;
};

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

export default function VocabularyPage() {
  const t = useT();
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vocabulary")
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter
    ? entries.filter((e) => e.jlpt_level === filter)
    : entries;

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  function toggleAnswer(id: string) {
    setShowAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-muted">{t("common.loading")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-pine">{t("vocab.title")}</h1>
        {entries.length > 0 && (
          <span className="text-sm text-muted">
            {t("vocab.wordCount", { n: entries.length })}
          </span>
        )}
      </div>

      {/* JLPT filter chips */}
      {entries.some((e) => e.jlpt_level) && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === null
                ? "bg-pine text-cream"
                : "border border-line bg-paper text-ink/60 hover:bg-mint"
            }`}
          >
            {t("vocab.filterAll")}
          </button>
          {JLPT_LEVELS.filter((lvl) =>
            entries.some((e) => e.jlpt_level === lvl),
          ).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(filter === lvl ? null : lvl)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === lvl
                  ? "bg-pine text-cream"
                  : "border border-line bg-paper text-ink/60 hover:bg-mint"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-4xl">📖</p>
          <p className="mt-3 font-semibold text-ink/70">{t("vocab.empty")}</p>
          <p className="mt-1 text-sm text-muted">{t("vocab.emptyHint")}</p>
        </div>
      )}

      {/* No results for current filter */}
      {entries.length > 0 && filtered.length === 0 && (
        <div className="py-8 text-center text-muted">
          {t("vocab.filterAll")} …
        </div>
      )}

      {/* Entry cards */}
      <div className="space-y-4">
        {filtered.map((entry) => (
          <article
            key={entry.id}
            className="gloss-panel rounded-[var(--radius-card)] p-5"
            style={tint("--color-tint-sage")}
          >
            {/* Word + level + delete */}
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-jp text-2xl font-bold leading-loose text-pine">
                  <Furigana text={buildRubyNotation(entry.word, entry.reading)} />
                </p>
                {entry.jlpt_level && (
                  <span className="mt-1 inline-block rounded-full bg-pine px-2.5 py-0.5 text-xs font-bold text-cream">
                    {entry.jlpt_level}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="shrink-0 rounded-xl p-2 text-muted transition-colors hover:bg-paper/80 hover:text-apricot disabled:opacity-50"
                aria-label={t("vocab.delete")}
              >
                {deletingId === entry.id ? "…" : "✕"}
              </button>
            </div>

            {/* Meaning */}
            <div className="mt-3 border-t border-line/40 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-moss-600">
                {t("vocab.meaning")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">
                {entry.meaning}
              </p>
            </div>

            {/* Example */}
            {entry.example_jp_ruby && (
              <div className="mt-3 border-t border-line/40 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-moss-600">
                  {t("vocab.example")}
                </p>
                <p className="mt-1 font-jp text-[15px] leading-loose text-pine">
                  <Furigana text={entry.example_jp_ruby} />
                </p>
                {entry.example_translation && (
                  <p className="mt-0.5 text-sm text-ink/55">
                    {entry.example_translation}
                  </p>
                )}
              </div>
            )}

            {/* Practice */}
            {entry.practice_question && (
              <div className="mt-3 border-t border-line/40 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-moss-600">
                  {t("vocab.practice")}
                </p>
                <p className="mt-1 font-jp text-[15px] leading-loose text-ink/80">
                  <Furigana text={entry.practice_question} />
                </p>
                <button
                  onClick={() => toggleAnswer(entry.id)}
                  className="mt-2 text-xs font-semibold text-moss-600 underline-offset-2 hover:underline hover:text-pine"
                >
                  {showAnswers.has(entry.id) ? "▲ " : "▼ "}
                  {t("vocab.answer")}
                </button>
                {showAnswers.has(entry.id) && entry.practice_answer && (
                  <p className="mt-1 rounded-lg bg-paper/80 px-3 py-2 font-jp text-sm font-semibold text-pine">
                    {entry.practice_answer}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
