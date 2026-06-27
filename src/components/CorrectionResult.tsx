"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import type { Correction } from "@/lib/types";
import { ObiePhoto } from "@/components/ObiePhoto";
import { Furigana } from "@/components/Furigana";
import { PracticeDrills } from "@/components/PracticeDrills";
import { useT, useLocale } from "@/contexts/locale";
import { getLessonInLocale } from "@/lib/lesson-i18n";
import { vocabWordText } from "@/lib/furigana";

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

// vocabWordText is imported from @/lib/furigana (shared with vocabulary page)

type SaveState = "idle" | "saving" | "saved" | "already_saved" | "error";

function SaveWordButton({
  word,
  reading,
  jlptLevel,
  state,
  onSave,
}: {
  word: string;
  reading: string;
  jlptLevel?: string;
  state: SaveState;
  onSave: (word: string, reading: string, jlptLevel?: string) => void;
}) {
  const t = useT();
  if (state === "saved" || state === "already_saved") {
    return (
      <span
        className="shrink-0 text-sm font-bold text-moss-600"
        title={t("vocab.saved")}
      >
        ✓
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span className="shrink-0 text-[10px] text-muted">{t("vocab.saving")}</span>
    );
  }
  return (
    <button
      onClick={() => onSave(word, reading, jlptLevel)}
      title={t("vocab.addToVocab")}
      className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-moss-600/40 text-sm font-bold text-moss-600 transition-colors hover:bg-pine hover:text-cream hover:border-pine"
      aria-label={t("vocab.addToVocab")}
    >
      +
    </button>
  );
}

function Label({ en, jp }: { en: string; jp: string }) {
  return (
    <p className="mb-2 flex flex-wrap items-baseline gap-x-2">
      <span className="text-sm font-bold text-pine">{en}</span>
      <Furigana text={jp} className="font-jp text-xs text-muted" />
    </p>
  );
}

export function CorrectionResult({
  correction,
  showOriginal = true,
}: {
  correction: Correction;
  showOriginal?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const miniLesson = correction.relatedMiniLesson
    ? getLessonInLocale(correction.relatedMiniLesson, locale)
    : null;

  // Vocabulary saving state
  const [wordStates, setWordStates] = useState<Map<string, SaveState>>(new Map());
  const [showVocabUpgrade, setShowVocabUpgrade] = useState(false);
  const [isIosApp, setIsIosApp] = useState(false);

  useEffect(() => {
    type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    if ((window as CapWindow).Capacitor?.isNativePlatform?.()) {
      setIsIosApp(true);
    }
  }, []);

  async function handleSaveWord(word: string, reading: string, jlptLevel?: string) {
    setWordStates((prev) => new Map(prev).set(word, "saving"));
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, reading, jlptLevel }),
      });
      if (res.status === 409) { setWordStates((prev) => new Map(prev).set(word, "already_saved")); return; }
      if (res.status === 403) { setWordStates((prev) => new Map(prev).set(word, "idle")); setShowVocabUpgrade(true); return; }
      if (!res.ok) { setWordStates((prev) => new Map(prev).set(word, "error")); setTimeout(() => setWordStates((prev) => new Map(prev).set(word, "idle")), 2000); return; }
      setWordStates((prev) => new Map(prev).set(word, "saved"));
    } catch {
      setWordStates((prev) => new Map(prev).set(word, "error"));
      setTimeout(() => setWordStates((prev) => new Map(prev).set(word, "idle")), 2000);
    }
  }

  async function handleSaveGrammar(pattern: string, expl: string, exRuby: string) {
    const key = `grammar:${pattern}`;
    setWordStates((prev) => new Map(prev).set(key, "saving"));
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: pattern, reading: "", explanation: expl, exampleRuby: exRuby, entryType: "grammar" }),
      });
      if (res.status === 409) { setWordStates((prev) => new Map(prev).set(key, "already_saved")); return; }
      if (res.status === 403) { setWordStates((prev) => new Map(prev).set(key, "idle")); setShowVocabUpgrade(true); return; }
      if (!res.ok) { setWordStates((prev) => new Map(prev).set(key, "error")); setTimeout(() => setWordStates((prev) => new Map(prev).set(key, "idle")), 2000); return; }
      setWordStates((prev) => new Map(prev).set(key, "saved"));
    } catch {
      setWordStates((prev) => new Map(prev).set(key, "error"));
      setTimeout(() => setWordStates((prev) => new Map(prev).set(key, "idle")), 2000);
    }
  }

  return (
    <div className="space-y-4">
      {/* Diary Title */}
      {correction.diaryTitle && (
        <div className="gloss-panel rounded-[var(--radius-card)] px-6 py-5 text-center" style={tint("--color-tint-sage")}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-moss-600">
            📓 {t("correction.diaryTitle")}
          </p>
          <p className="font-jp text-[22px] font-bold leading-loose text-pine">
            <Furigana text={correction.diaryTitle} />
          </p>
        </div>
      )}

      {/* Obie Cheer — personalised reaction to the diary content */}
      {correction.obieCheer && (
        <div className="gloss-green flex items-start gap-3 rounded-[var(--radius-card)] p-5">
          <ObiePhoto size={44} className="shrink-0 ring-2 ring-cream/25" />
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cream/70">
              🐾 {t("correction.obieCheer")}
            </p>
            <p className="font-jp text-[15px] font-medium leading-relaxed text-cream">
              <Furigana text={correction.obieCheer} />
            </p>
          </div>
        </div>
      )}

      {/* Original + Natural */}
      <div className="grid gap-4 md:grid-cols-2">
        {showOriginal && (
          <div className="gloss-card rounded-[var(--radius-card)] p-6">
            <Label en={t("correction.originalText")} jp="元(もと)の文(ぶん)" />
            <p className="font-jp text-[15px] leading-loose text-ink/70">
              {correction.original}
            </p>
          </div>
        )}

        {correction.natural && (
          <div className="gloss-panel relative rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sage")}>
            <Label en={t("correction.naturalJapanese")} jp="自然(しぜん)な日本語(にほんご)" />
            <p className="font-jp text-[15px] leading-loose text-ink">
              <Furigana text={correction.natural} />
            </p>
            <span className="stamp gloss absolute -right-2 -top-3 grid h-16 w-16 rotate-[-12deg] place-items-center rounded-full bg-paper text-center font-jp text-[10px] font-bold leading-tight text-apricot shadow-card">
              よく
              <br />
              書けました
            </span>
          </div>
        )}
      </div>

      {/* English Explanation */}
      <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-blue")}>
        <Label en={t("correction.explanation")} jp="解説(かいせつ)" />
        <p className="text-sm leading-relaxed text-ink/80">{correction.explanation}</p>
      </div>

      {/* Teacher's note — "not wrong, but more natural" */}
      {correction.correctionNote && (
        <div className="gloss-panel flex items-start gap-3 rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sand")}>
          <span className="text-lg">💡</span>
          <div>
            <Label en={t("correction.teachersNote")} jp="ひとことメモ" />
            <p className="text-sm leading-relaxed text-ink/80">{correction.correctionNote}</p>
          </div>
        </div>
      )}

      {/* Key Mistakes + Useful Vocabulary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-pink")}>
          <Label en={t("correction.keyMistakes")} jp="よくある間違(まちが)い" />
          {correction.mistakes.length === 0 ? (
            <p className="text-sm text-ink/70"><Furigana text="今回(こんかい)は間違(まちが)いなし。よく書(か)けています！" /></p>
          ) : (
            <ul className="space-y-3 text-sm">
              {correction.mistakes.map((m, i) => (
                <li key={i} className="rounded-xl bg-paper/60 p-3">
                  <Furigana text={m.before} className="font-jp text-ink/45 line-through" />
                  <span className="mx-1.5 text-moss">→</span>
                  <Furigana text={m.after} className="font-jp font-semibold text-pine" />
                  <span className="mt-0.5 block text-ink/65">{m.note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-green")}>
          <Label en={t("correction.usefulVocabulary")} jp="使(つか)える単語(たんご)" />
          <ul className="space-y-3 text-sm">
            {correction.vocabulary.map((v, i) => (
              <li key={i} className="rounded-xl bg-paper/60 p-3">
                <Furigana text={vocabWordText(v.word, v.reading)} className="font-jp text-[15px] font-semibold text-ink" />
                <span className="block text-ink/70">{v.meaning}</span>
                {v.example && (
                  <span className="mt-0.5 block font-jp text-xs text-ink/55">例: <Furigana text={v.example} /></span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Practice Sentence */}
      <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-violet")}>
        <Label en={t("correction.practiceSentence")} jp="練習文(れんしゅうぶん)" />
        <p className="font-jp text-[15px] leading-loose text-ink"><Furigana text={correction.practice.jp} /></p>
        {correction.practice.en && (
          <p className="mt-1 text-sm text-muted">{correction.practice.en}</p>
        )}
      </div>

      {/* Next Steps: vocabulary + grammar suggestions */}
      {((correction.nextVocab && correction.nextVocab.length > 0) ||
        (correction.nextGrammar && correction.nextGrammar.length > 0) ||
        (correction.alternativeWords && correction.alternativeWords.length > 0)) && (
        <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sand")}>
          <Label en={t("correction.nextSteps")} jp="次(つぎ)に使(つか)える言葉(ことば)・文法(ぶんぽう)" />

          {/* Next vocabulary */}
          {correction.nextVocab && correction.nextVocab.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-moss-600">
                {t("correction.nextVocab")}
              </p>
              <ul className="space-y-2 text-sm">
                {correction.nextVocab.map((v, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl bg-paper/60 px-3 py-2">
                    <Furigana
                      text={vocabWordText(v.word, v.reading)}
                      className="font-jp text-[15px] font-semibold text-pine"
                    />
                    <span className="text-ink/65 text-xs">{v.meaning}</span>
                    <span className="ml-auto shrink-0 rounded-full bg-pine px-2.5 py-0.5 text-xs font-bold text-cream">
                      {v.level}
                    </span>
                    <SaveWordButton
                      word={v.word}
                      reading={v.reading}
                      jlptLevel={v.level}
                      state={wordStates.get(v.word) ?? "idle"}
                      onSave={handleSaveWord}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next grammar */}
          {correction.nextGrammar && correction.nextGrammar.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-moss-600">
                {t("correction.nextGrammar")}
              </p>
              <ul className="space-y-3 text-sm">
                {correction.nextGrammar.map((g, i) => (
                  <li key={i} className="rounded-xl bg-paper/60 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-jp text-[13px] font-bold text-pine">{g.pattern}</span>
                      <span className="text-muted">—</span>
                      <span className="flex-1 text-xs text-ink/70">{g.explanation}</span>
                      <SaveWordButton
                        word={`grammar:${g.pattern}`}
                        reading=""
                        state={wordStates.get(`grammar:${g.pattern}`) ?? "idle"}
                        onSave={() => handleSaveGrammar(g.pattern, g.explanation, g.exampleRuby)}
                      />
                    </div>
                    {g.exampleRuby && (
                      <p className="mt-1.5 font-jp text-[13px] leading-loose text-ink/80">
                        <Furigana text={g.exampleRuby} />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternative words */}
          {correction.alternativeWords && correction.alternativeWords.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-moss-600">
                {t("correction.alternatives")}
              </p>
              <ul className="space-y-2 text-sm">
                {correction.alternativeWords.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl bg-paper/60 px-3 py-2">
                    <span className="font-jp text-ink/65">{a.original}</span>
                    <span className="mx-1 font-bold text-moss">→</span>
                    <Furigana
                      text={vocabWordText(a.alternative, a.alternativeReading)}
                      className="font-jp font-semibold text-pine"
                    />
                    <span className="ml-auto">
                      <SaveWordButton
                        word={a.alternative}
                        reading={a.alternativeReading}
                        state={wordStates.get(a.alternative) ?? "idle"}
                        onSave={handleSaveWord}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs text-muted">{t("correction.levelDisclaimer")}</p>
        </div>
      )}

      {/* Vocabulary upgrade prompt (shown when Free limit is reached) */}
      {showVocabUpgrade && (
        <div className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">{t("vocab.limitReached")}</p>
            <p className="mt-0.5 text-xs text-amber-700">
              {isIosApp ? t("vocab.limitDescIos") : t("vocab.limitDesc")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isIosApp && (
              <a
                href="/upgrade"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                {t("vocab.upgradeBtn")}
              </a>
            )}
            <button
              onClick={() => setShowVocabUpgrade(false)}
              className="text-amber-500 hover:text-amber-800"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Obie Phrase — natural Japanese phrase of the day */}
      {(correction.obiePhraseRuby || correction.obiePhraseExplanation) && (
        <div className="gloss-panel flex items-start gap-3 rounded-[var(--radius-card)] p-5" style={tint("--color-tint-sage")}>
          <ObiePhoto size={44} className="shrink-0 ring-2 ring-pine/20" />
          <div className="min-w-0">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-moss-600">
              🐾 {t("correction.obiePhrase")}
            </p>
            {correction.obiePhraseRuby && (
              <p className="font-jp text-[18px] font-bold leading-loose text-pine">
                <Furigana text={correction.obiePhraseRuby} />
              </p>
            )}
            {correction.obiePhraseExplanation && (
              <p className="mt-1 text-sm leading-relaxed text-ink/75">{correction.obiePhraseExplanation}</p>
            )}
          </div>
        </div>
      )}

      {/* Mini Lesson Preview */}
      {miniLesson && (
        <div className="gloss-card overflow-hidden rounded-[var(--radius-card)]">
          <div className="flex items-center justify-between gap-2 bg-pine px-5 py-3">
            <p className="font-serif text-base font-bold text-cream">📘 {t("correction.miniLesson")}</p>
            <a href="/support?tab=lessons" className="text-xs font-semibold text-cream/80 hover:text-cream">
              📚 {t("correction.seeAll")}
            </a>
          </div>
          <div className="space-y-3 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-moss-600">
                {t("correction.lesson", { n: miniLesson.order })}
              </p>
              <h3 className="font-serif text-lg font-bold text-pine">{miniLesson.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{miniLesson.shortExplanation}</p>
            </div>

            <div className="rounded-xl bg-mint/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-moss-600">🧠 {t("correction.visualImage")}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink/85">{miniLesson.visualImage}</p>
            </div>

            {miniLesson.points && miniLesson.points.length > 0 && (
              <ul className="space-y-1.5">
                {miniLesson.points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-paper/70 px-3 py-2.5 text-sm">
                    <span className="mt-0.5 shrink-0 font-bold text-moss-600">{i + 1}.</span>
                    <span className="min-w-0">
                      <span className="text-ink/85"><Furigana text={pt.text} /></span>
                      {pt.example && (
                        <span className="mt-0.5 block font-jp text-xs text-ink/55">
                          例: <Furigana text={pt.example} />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-xl border border-line bg-paper p-3">
              <Furigana text={miniLesson.exampleJapaneseRuby} className="font-jp text-[15px] text-ink" />
              <p className="mt-1 text-sm text-muted">{miniLesson.exampleEnglish}</p>
            </div>

            {miniLesson.shortNote && (
              <p className="text-sm leading-relaxed text-ink/75">💡 {miniLesson.shortNote}</p>
            )}
          </div>
        </div>
      )}

      {/* Practice Drills — only shown when AI returned drills (write page) */}
      <PracticeDrills drills={correction.practiceDrills} />

      {/* Obie encouragement */}
      <div className="gloss-green flex items-center gap-4 rounded-[var(--radius-card)] p-6">
        <ObiePhoto size={52} className="ring-2 ring-cream/25" />
        <div className="min-w-0 flex-1">
          <p className="font-jp text-[15px] font-medium text-cream">
            <Furigana text="いいですね！日本語(にほんご)がどんどん上手(じょうず)になっています。この調子(ちょうし)で続(つづ)けましょう！🌸" />
          </p>
          <div className="mt-2.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-cream/20">
            <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-moss to-sage" />
          </div>
        </div>
      </div>
    </div>
  );
}
