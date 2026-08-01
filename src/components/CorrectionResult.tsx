"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import type { Correction } from "@/lib/types";
import { ObiePhoto } from "@/components/ObiePhoto";
import { Furigana, NoRuby } from "@/components/Furigana";
import { AudioLimitNotice, PlayButton, type PlayButtonKind } from "@/components/PlayButton";
import { PracticeDrills } from "@/components/PracticeDrills";
import { LearnedUsedPanel } from "@/components/LearnedUsedPanel";
import type { UsedExpression } from "@/lib/learned-display";
import { useT, useLocale } from "@/contexts/locale";
import { getLessonInLocale } from "@/lib/lesson-i18n";
import { readingValue, safeVocabWordText } from "@/lib/reading-validation";
import { plainValue } from "@/lib/text-kinds";

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

// safeVocabWordText wraps vocabWordText (@/lib/furigana, shared with the
// vocabulary page) and drops a reading that cannot belong to its word — the AI
// returns 歩く/ある often enough that rendering it unchecked shows ある as the
// furigana for the whole word. See @/lib/reading-validation.

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

/**
 * Placeholder for the paid sections a Free learner doesn't get. The content is
 * never generated for them, so this shows one padlocked frame instead of a gap.
 *
 * Inside the iOS app the title AND the body switch to neutral wording and the
 * upgrade link is dropped (App Store Guideline 3.1.1). The title needs its own
 * iOS variant because the web one names the plan. All three branches live here
 * so the guard has a single copy — this frame renders on every Free correction.
 */
function LockedSection({
  titleKey,
  titleIosKey,
  descKey,
  descIosKey,
  isIosApp,
}: {
  titleKey: string;
  titleIosKey: string;
  descKey: string;
  descIosKey: string;
  isIosApp: boolean;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-8 text-center">
      <h3 className="font-serif text-lg font-bold text-ink/55">
        {isIosApp ? t(titleIosKey) : t(titleKey)}
      </h3>
      <p className="max-w-sm text-sm text-ink/65">{isIosApp ? t(descIosKey) : t(descKey)}</p>
      {!isIosApp && (
        <a
          href="/upgrade"
          className="gloss-btn mt-1 rounded-full px-4 py-2 text-sm font-semibold text-cream hover:brightness-105"
        >
          {t("locked.upgradeBtn")}
        </a>
      )}
    </div>
  );
}

export function CorrectionResult({
  correction,
  showOriginal = true,
  locked,
  usedExpressions,
  disableAudio = false,
}: {
  correction: Correction;
  showOriginal?: boolean;
  /**
   * Sections to render as a locked placeholder instead of content, so a Free
   * learner can see the feature exists without it being generated for them.
   * Only the write page passes this — every other caller omits it and renders
   * exactly as before.
   */
  locked?: { drills?: boolean; miniLesson?: boolean };
  /**
   * Saved expressions this diary actually used, from /api/learned/scan.
   *
   * Same opt-in shape as `locked`: only the write page passes it, because only
   * there does a diary get saved and scanned while the result is on screen.
   * History and diary detail render a stored correction with no scan attached,
   * and the tour sample must not claim the learner used anything — all three
   * omit it and are unchanged.
   *
   * Arrives a beat after the rest of the result: the scan cannot run until the
   * diary row exists, so this is undefined on first paint and fills in when the
   * response lands.
   */
  usedExpressions?: UsedExpression[];
  /**
   * Renders no 🔊 buttons at all.
   *
   * Set by the tour, and it matters more than it looks: the audio allowance is
   * three plays for a LIFETIME, and TourSampleSheet renders this component on
   * fake data. A working button there would let the tutorial itself spend a
   * third of what a learner gets, on a sample sentence, before they have
   * written anything. TourSampleSheet already wraps the sheet in a disabled
   * <fieldset>, which happens to neutralise the click too — but that is a
   * layout detail that could be refactored away, and a dead button in a
   * walkthrough is confusing even while it holds. Not rendering it is the
   * honest version.
   */
  disableAudio?: boolean;
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

  /**
   * One lifetime allowance is shared by every 🔊 on this result, so the state
   * lives here rather than in each button: running out anywhere switches all
   * of them off, and `at` records which slot was tapped so the explanation can
   * be rendered there instead of once per button.
   */
  const [audioLimit, setAudioLimit] = useState<{ limit: number; at: string } | null>(null);

  /**
   * SENTENCES on this page are kind="diary" and single WORDS are kind="word".
   *
   * The natural version, both sides of a mistake and a vocabulary example are
   * the learner's own writing or written in its context (rule 10 of the
   * /api/correct prompt picks the vocabulary "from or related to the diary"),
   * so they belong in the per-user tts-diary bucket that /api/account/delete
   * clears.
   *
   * A bare headword does not. 散歩 is a dictionary word, it carries nothing
   * personal, and tts-shared is content-addressed — retrieving the clip
   * requires already knowing the exact word. Sharing it means the second
   * learner to meet 散歩 gets a cache hit, and a cache hit costs no credit at
   * all. With three plays for a lifetime on Free, that is the difference
   * between these buttons being usable and being a trap.
   */
  function audioButton(
    at: string,
    text: string | string[],
    label: string,
    opts: { kind?: PlayButtonKind; showLabel?: boolean; size?: "sm" | "md" } = {},
  ) {
    if (disableAudio) return null;
    return (
      <PlayButton
        text={text}
        kind={opts.kind ?? "diary"}
        label={label}
        showLabel={opts.showLabel}
        size={opts.size}
        disabled={audioLimit !== null}
        onLimitReached={(limit) => setAudioLimit({ limit, at })}
      />
    );
  }

  function audioNotice(at: string, className = "") {
    if (audioLimit?.at !== at) return null;
    return <AudioLimitNotice limit={audioLimit.limit} className={className} />;
  }

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

      {/* "You used a word you saved" — sits right under Obie's cheer so it
          lands in the praise band at the top, where it is seen without
          scrolling, and pairs with Next Steps further down: this is the payoff
          for words saved from an earlier correction, that is where the next
          ones get saved. Renders nothing when the prop is absent or empty. */}
      {usedExpressions && usedExpressions.length > 0 && (
        <LearnedUsedPanel used={usedExpressions} />
      )}

      {/* Original + Natural */}
      <div className="grid gap-4 md:grid-cols-2">
        {showOriginal && (
          <div className="gloss-card rounded-[var(--radius-card)] p-6">
            <Label en={t("correction.originalText")} jp="元(もと)の文(ぶん)" />
            <p className="font-jp text-[15px] leading-loose text-ink/70">
              {correction.originalRuby ? (
                <Furigana text={correction.originalRuby} />
              ) : (
                correction.original
              )}
            </p>
          </div>
        )}

        {correction.natural && (
          <div className="gloss-panel relative rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sage")}>
            <Label en={t("correction.naturalJapanese")} jp="自然(しぜん)な日本語(にほんご)" />
            <p className="font-jp text-[15px] leading-loose text-ink">
              <Furigana text={correction.natural} />
            </p>
            {/* Under the sentence rather than up in the label. The label row
                already carries an English and a Japanese heading, and the
                よく書けました stamp sits absolutely over the top-right corner,
                so a third item there wrapped underneath it on a narrow screen.
                Down here the full width of the card is free — which is what
                lets this be the large labelled one. */}
            <div className="mt-3">
              {audioButton("natural", correction.natural, t("audio.playSentence"), {
                showLabel: true,
                size: "md",
              })}
            </div>
            {audioNotice("natural", "mt-2")}
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
        <p className="text-sm leading-relaxed text-ink/80"><NoRuby text={correction.explanation} /></p>
      </div>

      {/* Teacher's note — "not wrong, but more natural" */}
      {correction.correctionNote && (
        <div className="gloss-panel flex items-start gap-3 rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sand")}>
          <span className="text-lg">💡</span>
          <div>
            <Label en={t("correction.teachersNote")} jp="ひとことメモ" />
            <p className="text-sm leading-relaxed text-ink/80"><NoRuby text={correction.correctionNote} /></p>
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
                  <span className="mt-0.5 block text-ink/65"><NoRuby text={m.note} /></span>
                  {/* Own line, under the note. Sharing a flex row with the
                      correction squeezed the text into half the column AND
                      capped the button at an icon nobody read as a button.
                      One button for the pair, not one each: passing both as an
                      array makes it a single request, and so a single credit,
                      with a pause between them. */}
                  <div className="mt-2">
                    {audioButton(`mistake:${i}`, [m.before, m.after], t("audio.playBeforeAfter"), {
                      showLabel: true,
                    })}
                  </div>
                  {audioNotice(`mistake:${i}`, "mt-2")}
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
                {/* The headword had no button at all until now, while the same
                    word on the vocabulary page did. kind="word" — a headword
                    is a dictionary word, so it goes in the shared bucket and
                    is usually already there. */}
                <span className="flex items-center gap-1.5">
                  <Furigana
                    text={safeVocabWordText(v.word, v.reading)}
                    className="font-jp text-[15px] font-semibold text-ink"
                  />
                  {audioButton(
                    `vocabWord:${i}`,
                    safeVocabWordText(v.word, v.reading),
                    t("audio.playWord"),
                    { kind: "word" },
                  )}
                </span>
                <span className="block text-ink/70"><NoRuby text={v.meaning} /></span>
                {v.example && (
                  <>
                    <span className="mt-0.5 block font-jp text-xs text-ink/55">
                      例: <Furigana text={v.example} />
                    </span>
                    {/* The example stays kind="diary": rule 10 of the
                        /api/correct prompt writes it in the diary's context. */}
                    <div className="mt-2">
                      {audioButton(`vocab:${i}`, v.example, t("audio.playExample"), {
                        showLabel: true,
                      })}
                    </div>
                  </>
                )}
                {audioNotice(`vocabWord:${i}`, "mt-2")}
                {audioNotice(`vocab:${i}`, "mt-2")}
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
                  <li key={i} className="rounded-xl bg-paper/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Furigana
                        text={safeVocabWordText(v.word, v.reading)}
                        className="font-jp text-[15px] font-semibold text-pine"
                      />
                      <span className="text-ink/65 text-xs"><NoRuby text={v.meaning} /></span>
                      <span className="ml-auto shrink-0 rounded-full bg-pine px-2.5 py-0.5 text-xs font-bold text-cream">
                        {v.level}
                      </span>
                      {/* Icon only, and next to save rather than on a line of
                          its own: three suggestions means three of these, and
                          three "Listen" pills stacked down the card shout
                          louder than the words they belong to. The labelled
                          ones are spent where they earn it. */}
                      {audioButton(
                        `nextVocab:${i}`,
                        safeVocabWordText(v.word, v.reading),
                        t("audio.playWord"),
                        { kind: "word" },
                      )}
                      <SaveWordButton
                        word={v.word}
                        reading={readingValue(v.reading)}
                        jlptLevel={v.level}
                        state={wordStates.get(v.word) ?? "idle"}
                        onSave={handleSaveWord}
                      />
                    </div>
                    {audioNotice(`nextVocab:${i}`, "mt-2")}
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
                      <span className="font-jp text-[13px] font-bold text-pine"><NoRuby text={g.pattern} /></span>
                      <span className="text-muted">—</span>
                      <span className="flex-1 text-xs text-ink/70"><NoRuby text={g.explanation} /></span>
                      <SaveWordButton
                        word={`grammar:${plainValue(g.pattern)}`}
                        reading=""
                        state={wordStates.get(`grammar:${plainValue(g.pattern)}`) ?? "idle"}
                        onSave={() =>
                          handleSaveGrammar(
                            plainValue(g.pattern),
                            plainValue(g.explanation),
                            g.exampleRuby,
                          )
                        }
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
                    <span className="font-jp text-ink/65"><NoRuby text={a.original} /></span>
                    <span className="mx-1 font-bold text-moss">→</span>
                    <Furigana
                      text={safeVocabWordText(a.alternative, a.alternativeReading)}
                      className="font-jp font-semibold text-pine"
                    />
                    <span className="ml-auto">
                      <SaveWordButton
                        word={a.alternative}
                        reading={readingValue(a.alternativeReading)}
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
              <p className="mt-1 text-sm leading-relaxed text-ink/75"><NoRuby text={correction.obiePhraseExplanation} /></p>
            )}
          </div>
        </div>
      )}

      {/* One locked frame standing in for both paid sections. Free gets neither
          the mini lesson nor the drills, and two padlocked cards with two
          buttons crowded the result — so they share a single card here, in the
          mini lesson's usual slot. The drills block below renders nothing when
          locked. */}
      {locked?.miniLesson && locked?.drills && (
        <LockedSection
          titleKey="locked.combined.title"
          titleIosKey="locked.combined.titleIos"
          descKey="locked.combined.desc"
          descIosKey="locked.combined.descIos"
          isIosApp={isIosApp}
        />
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
              <h3 className="font-serif text-lg font-bold text-pine"><NoRuby text={miniLesson.title} /></h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/80"><NoRuby text={miniLesson.shortExplanation} /></p>
            </div>

            <div className="rounded-xl bg-mint/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-moss-600">🧠 {t("correction.visualImage")}</p>
              {/* Unwrapped, not stripped: visualImage is never one of the four
                  fields buildMiniLessonFromAI overrides, so it is always the
                  authored lesson text — and NoRuby would delete the 漢字(かな)
                  readings written into it. */}
              <p className="mt-0.5 text-sm leading-relaxed text-ink/85">{plainValue(miniLesson.visualImage)}</p>
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
              <p className="mt-1 text-sm text-muted"><NoRuby text={miniLesson.exampleEnglish} /></p>
            </div>

            {miniLesson.shortNote && (
              <p className="text-sm leading-relaxed text-ink/75">💡 <NoRuby text={miniLesson.shortNote} /></p>
            )}
          </div>
        </div>
      )}

      {/* Practice Drills — only shown when AI returned drills (write page).
          When locked, the combined frame above already covers this section. */}
      {!locked?.drills && <PracticeDrills drills={correction.practiceDrills} />}

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
