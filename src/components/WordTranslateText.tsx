"use client";

import { useState, useMemo } from "react";
import { Furigana } from "@/components/Furigana";
import { segmentJapanese } from "@/lib/segmenter";
import { useT } from "@/contexts/locale";

// Strips furigana notation, returning plain Japanese so TinySegmenter
// sees clean text without （）or <rt> markers.
function stripFurigana(text: string): string {
  return (
    text
      // <ruby>base<rt>reading</rt></ruby> → base (drop HTML tags from base too)
      .replace(
        /<ruby>([\s\S]*?)<rt>[\s\S]*?<\/rt><\/ruby>/g,
        (_, base: string) => base.replace(/<[^>]*>/g, "")
      )
      // Remaining HTML tags
      .replace(/<[^>]*>/g, "")
      // 漢字（かな）or 漢字(かな)
      .replace(/[（(][ぁ-んァ-ヶーゝゞ]+[）)]/g, "")
  );
}

type Seg = { text: string; isTappable: boolean };

// Inflectional suffix fragments that TinySegmenter splits off as separate tokens
// but which are never useful as standalone translation targets. Merging them into
// the preceding token reconstructs natural word-forms:
//   買い + まし + た  → 買いました
//   おいしかっ + た  → おいしかった
//   食べ + て + い + ませ + ん  → 食べて + いません
const ATTACH_TO_PREV = new Set([
  // polite-form fragments
  "まし", "ます", "ました", "ません",
  // copula fragments
  "でし", "でした",
  // adjective past-form fragment (おいしかっ+た)
  "かっ",
  // negative fragments
  "なかっ", "ない",
  // negative-polite fragment + nasal coda (ませ+ん in いません)
  "ませ", "ん",
  // passive / potential / causative stems
  "られ", "させ",
  // past tense auxiliary
  "た",
  // te-form connector (食べて、行って)
  "て",
  // volitional final mora (行きましょ+う)
  "う",
]);

// Merges inflectional suffix fragments into the preceding token. Single pass:
// chains like まし→た resolve because each token is appended to the growing
// last element before the next iteration checks it.
function mergeInflections(tokens: string[]): string[] {
  const out: string[] = [];
  for (const tok of tokens) {
    if (out.length > 0 && ATTACH_TO_PREV.has(tok)) {
      out[out.length - 1] += tok;
    } else {
      out.push(tok);
    }
  }
  return out;
}

function makeSegments(plain: string): Seg[] {
  const merged = mergeInflections(segmentJapanese(plain));
  return merged.flatMap((word) => {
    const parts: Seg[] = [];
    let pos = 0;
    while (pos < word.length) {
      const nl = word.indexOf("\n", pos);
      if (nl === -1) {
        const sub = word.slice(pos);
        if (sub) parts.push({ text: sub, isTappable: sub.trim().length > 0 });
        break;
      }
      if (nl > pos) parts.push({ text: word.slice(pos, nl), isTappable: true });
      parts.push({ text: "\n", isTappable: false });
      pos = nl + 1;
    }
    return parts;
  });
}

/**
 * Renders Japanese text with an optional word-by-word translation mode.
 *
 * Normal mode: text rendered with furigana (via Furigana component).
 * Word-tap mode: furigana stripped, each TinySegmenter word is a tappable
 *   button. Tapping a word calls /api/translate-text and shows the result
 *   inline. Results are cached per-word for the component lifetime.
 *
 * textClassName applies to the text container in both modes.
 */
export function WordTranslateText({
  text,
  language,
  textClassName,
}: {
  text: string;
  language: string;
  textClassName?: string;
}) {
  const t = useT();
  const [active, setActive] = useState(false);
  const [tappedWord, setTappedWord] = useState<string | null>(null);
  const [wordTranslation, setWordTranslation] = useState<string | null>(null);
  // Stable Map for per-word cache — mutated without triggering re-renders
  const [cache] = useState<Map<string, string>>(new Map());
  const [loadingWord, setLoadingWord] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const plainText = useMemo(() => stripFurigana(text), [text]);
  const segments = useMemo(() => makeSegments(plainText), [plainText]);

  async function handleWordTap(word: string) {
    if (word === tappedWord) {
      setTappedWord(null);
      setWordTranslation(null);
      setWordError(null);
      return;
    }
    setTappedWord(word);
    setWordError(null);

    // Once the daily limit is reached, subsequent uncached taps show the limit
    // message directly without making another API call (server would just 429 again).
    if (limitReached) {
      setWordError(t("translate.dailyLimit", { limit: "10" }));
      return;
    }

    const cached = cache.get(word);
    if (cached !== undefined) {
      setWordTranslation(cached);
      return;
    }

    setLoadingWord(true);
    setWordTranslation(null);
    try {
      const res = await fetch("/api/translate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: word, language }),
      });
      const data: { translation?: string; error?: string; limit?: number } = await res.json();
      if (res.ok && data.translation) {
        cache.set(word, data.translation);
        setWordTranslation(data.translation);
      } else if (res.status === 429) {
        setLimitReached(true);
        setWordError(t("translate.dailyLimit", { limit: String(data.limit ?? 10) }));
      } else {
        setWordError(data.error || t("translate.failed"));
      }
    } catch {
      setWordError(t("translate.networkError"));
    } finally {
      setLoadingWord(false);
    }
  }

  function toggleMode() {
    setActive((v) => !v);
    setTappedWord(null);
    setWordTranslation(null);
    setWordError(null);
  }

  const cls = textClassName ?? "font-jp text-base leading-loose text-ink";

  return (
    <div>
      {/* Normal mode: furigana display */}
      {!active && (
        <p className={cls}>
          <Furigana text={text} />
        </p>
      )}

      {/* Word-tap mode */}
      {active && (
        <div>
          <div className={`${cls} select-none`}>
            {segments.map((seg, i) => {
              if (seg.text === "\n") return <br key={i} />;
              if (!seg.isTappable) return <span key={i}>{seg.text}</span>;
              const isActive = seg.text === tappedWord;
              return (
                <button
                  key={i}
                  type="button"
                  // onPointerDown: fires before browser text-selection, works for
                  // both touch (no 300 ms delay) and mouse
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleWordTap(seg.text);
                  }}
                  className={`touch-manipulation inline rounded px-0.5 font-jp text-base transition-colors ${
                    isActive
                      ? "bg-pine/20 text-pine font-semibold ring-1 ring-pine/30"
                      : "text-ink hover:bg-mint/40 active:bg-mint/60"
                  }`}
                >
                  {seg.text}
                </button>
              );
            })}
          </div>

          {/* Word translation result */}
          {tappedWord && (
            <div className="mt-2 flex min-h-[2rem] flex-wrap items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5">
              <span className="font-jp font-semibold text-pine">{tappedWord}</span>
              <span className="text-muted">→</span>
              {loadingWord ? (
                <span className="text-sm text-muted">…</span>
              ) : wordError ? (
                <span className="text-sm text-apricot">{wordError}</span>
              ) : wordTranslation !== null ? (
                <span className="text-sm text-ink">{wordTranslation}</span>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleMode}
        className="mt-1.5 text-xs font-semibold text-moss-600/70 transition-colors hover:text-pine"
      >
        {active ? t("translate.tapWordOff") : t("translate.tapWord")}
      </button>
    </div>
  );
}
