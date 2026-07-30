"use client";

import { Furigana } from "@/components/Furigana";
import { GoalRing } from "@/components/GoalRing";
import { ObiePhoto } from "@/components/ObiePhoto";
import { useT } from "@/contexts/locale";
import { safeVocabWordText } from "@/lib/reading-validation";
import { GRADUATION_AT, type UsedExpression } from "@/lib/learned-display";

/**
 * 「保存していた表現を、この日記で実際に使えた」を添削結果の中で見せる。
 *
 * 表示は2段構え:
 *   ・まだ卒業していない語 … 控えめな gloss-panel。使えたことと x/3 を出すだけ。
 *   ・ちょうど卒業した語   … gloss-green + Obie + スタンプに昇格。
 * 毎回同じ強さで祝うと3回目の重みが消えるので、差を付けている。
 *
 * 表示専用。fetch も書き込みもしない。渡された配列を並べるだけで、
 * 判定も記録も /api/learned/scan 側で完了している。
 *
 * 空配列なら何も描かない。「使えた表現はありませんでした」は出さない —
 * 添削結果は褒める場所で、そこに不足の報告を挟む理由がない。
 */

/** 1件ぶんの行。語 → 実際に出た形 と、進捗リング。 */
function UsedRow({ item, tone }: { item: UsedExpression; tone: "quiet" | "loud" }) {
  const pct = Math.min(100, Math.round((item.useCount / GRADUATION_AT) * 100));
  const isLoud = tone === "loud";

  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
        isLoud ? "bg-cream/15" : "bg-paper/60"
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* 保存した見出し語 → 日記に出た形。matchedText は学習者自身が書いた
            文字列なので、ふりがなは付けずそのまま見せる（活用形の読みは
            持っていないし、推測で振ると間違える）。 */}
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <Furigana
            text={safeVocabWordText(item.word, item.reading ?? undefined)}
            className={`font-jp text-[15px] font-semibold ${isLoud ? "text-cream" : "text-pine"}`}
          />
          <span className={isLoud ? "text-cream/60" : "text-moss"}>→</span>
          <span className={`font-jp text-[15px] ${isLoud ? "text-cream/90" : "text-ink/80"}`}>
            {item.matchedText}
          </span>
        </p>
      </div>
      <GoalRing
        size={40}
        value={pct}
        label={`${Math.min(item.useCount, GRADUATION_AT)}/${GRADUATION_AT}`}
      />
    </li>
  );
}

export function LearnedUsedPanel({ used }: { used: UsedExpression[] }) {
  const t = useT();

  if (used.length === 0) return null;

  const graduated = used.filter((u) => u.graduated);
  const inProgress = used.filter((u) => !u.graduated);

  return (
    <div className="space-y-4">
      {/* ちょうど卒業した語 — この画面で一番強い演出 */}
      {graduated.length > 0 && (
        <div className="gloss-green relative flex items-start gap-3 rounded-[var(--radius-card)] p-5">
          <ObiePhoto size={44} className="shrink-0 ring-2 ring-cream/25" />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cream/70">
              🎉 {t("learned.graduatedTitle")}
            </p>
            <p className="mb-3 text-[15px] font-medium leading-relaxed text-cream">
              {t("learned.graduatedBody")}
            </p>
            <ul className="space-y-1.5">
              {graduated.map((item) => (
                <UsedRow key={item.id} item={item} tone="loud" />
              ))}
            </ul>
          </div>
          {/* 「よく書けました」と同じスタンプの意匠。卒業のときだけ出す。
              sm 未満では隠す — 375px だと本文に重なるため。 */}
          <span className="stamp gloss absolute -right-2 -top-3 hidden h-16 w-16 rotate-[-12deg] place-items-center rounded-full bg-paper text-center font-jp text-[10px] font-bold leading-tight text-apricot shadow-card sm:grid">
            {t("learned.stampLabel")}
          </span>
        </div>
      )}

      {/* まだ途中の語 — 静かに、進捗だけ */}
      {inProgress.length > 0 && (
        <div
          className="gloss-panel rounded-[var(--radius-card)] p-5"
          style={{ ["--tint" as string]: "var(--color-tint-sage)" }}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-moss-600">
            🎉 {t("learned.usedTitle")}
          </p>
          <p className="mb-3 text-sm text-ink/70">{t("learned.usedSubtitle")}</p>
          <ul className="space-y-1.5">
            {inProgress.map((item) => (
              <UsedRow key={item.id} item={item} tone="quiet" />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
