import type { CSSProperties } from "react";
import type { Correction } from "@/lib/types";
import { ObiePhoto } from "@/components/ObiePhoto";
import { Furigana } from "@/components/Furigana";
import { PracticeDrills } from "@/components/PracticeDrills";

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
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
  return (
    <div className="space-y-4">
      {/* Original + Natural */}
      <div className="grid gap-4 md:grid-cols-2">
        {showOriginal && (
          <div className="gloss-card rounded-[var(--radius-card)] p-6">
            <Label en="Original Text" jp="元(もと)の文(ぶん)" />
            <p className="font-jp text-[15px] leading-loose text-ink/70">
              {correction.original}
            </p>
          </div>
        )}

        {correction.natural && (
          <div className="gloss-panel relative rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sage")}>
            <Label en="Natural Japanese" jp="自然(しぜん)な日本語(にほんご)" />
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
        <Label en="English Explanation" jp="英語(えいご)での説明(せつめい)" />
        <p className="text-sm leading-relaxed text-ink/80">{correction.explanation}</p>
      </div>

      {/* Teacher's note — "not wrong, but more natural" */}
      {correction.correctionNote && (
        <div className="gloss-panel flex items-start gap-3 rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sand")}>
          <span className="text-lg">💡</span>
          <div>
            <Label en="Teacher's Note" jp="ひとことメモ" />
            <p className="text-sm leading-relaxed text-ink/80">{correction.correctionNote}</p>
          </div>
        </div>
      )}

      {/* Key Mistakes + Useful Vocabulary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-pink")}>
          <Label en="Key Mistakes" jp="よくある間違(まちが)い" />
          {correction.mistakes.length === 0 ? (
            <p className="text-sm text-ink/70"><Furigana text="今回(こんかい)は間違(まちが)いなし。よく書(か)けています！" /></p>
          ) : (
            <ul className="space-y-3 text-sm">
              {correction.mistakes.map((m, i) => (
                <li key={i} className="rounded-xl bg-paper/60 p-3">
                  <span className="font-jp text-ink/45 line-through">{m.before}</span>
                  <span className="mx-1.5 text-moss">→</span>
                  <Furigana text={m.after} className="font-jp font-semibold text-pine" />
                  <span className="mt-0.5 block text-ink/65">{m.note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="gloss-panel rounded-[var(--radius-card)] p-6" style={tint("--color-tint-green")}>
          <Label en="Useful Vocabulary" jp="使(つか)える単語(たんご)" />
          <ul className="space-y-3 text-sm">
            {correction.vocabulary.map((v, i) => (
              <li key={i} className="rounded-xl bg-paper/60 p-3">
                <Furigana text={v.word} className="font-jp text-[15px] font-semibold text-ink" />
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
        <Label en="Practice Sentence" jp="練習文(れんしゅうぶん)" />
        <p className="font-jp text-[15px] leading-loose text-ink"><Furigana text={correction.practice.jp} /></p>
        {correction.practice.en && (
          <p className="mt-1 text-sm text-muted">{correction.practice.en}</p>
        )}
      </div>

      {/* Mini Lesson Preview */}
      {correction.relatedMiniLesson && (
        <div className="gloss-card overflow-hidden rounded-[var(--radius-card)]">
          <div className="flex items-center justify-between gap-2 bg-pine px-5 py-3">
            <p className="font-serif text-base font-bold text-cream">📘 Mini Lesson Preview</p>
            <a href="/support?tab=lessons" className="text-xs font-semibold text-cream/80 hover:text-cream">
              📚 See all
            </a>
          </div>
          <div className="space-y-3 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-moss-600">
                Lesson {correction.relatedMiniLesson.order}
              </p>
              <h3 className="font-serif text-lg font-bold text-pine">{correction.relatedMiniLesson.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{correction.relatedMiniLesson.shortExplanation}</p>
            </div>

            <div className="rounded-xl bg-mint/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-moss-600">🧠 Visual Image</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink/85">{correction.relatedMiniLesson.visualImage}</p>
            </div>

            {correction.relatedMiniLesson.points && correction.relatedMiniLesson.points.length > 0 && (
              <ul className="space-y-1.5">
                {correction.relatedMiniLesson.points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-paper/70 px-3 py-2.5 text-sm">
                    <span className="mt-0.5 shrink-0 font-bold text-moss-600">{i + 1}.</span>
                    <span className="min-w-0">
                      <span className="text-ink/85">{pt.text}</span>
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
              <Furigana text={correction.relatedMiniLesson.exampleJapaneseRuby} className="font-jp text-[15px] text-ink" />
              <p className="mt-1 text-sm text-muted">{correction.relatedMiniLesson.exampleEnglish}</p>
            </div>

            {correction.relatedMiniLesson.shortNote && (
              <p className="text-sm leading-relaxed text-ink/75">💡 {correction.relatedMiniLesson.shortNote}</p>
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
