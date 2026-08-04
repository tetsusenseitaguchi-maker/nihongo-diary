"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Furigana, NoRuby } from "@/components/Furigana";
import { AudioLimitNotice, PlayButton } from "@/components/PlayButton";
import { NativeGate } from "@/components/NativeGate";
import { useT } from "@/contexts/locale";
import { safeRubyNotation } from "@/lib/reading-validation";
import { addDays } from "@/lib/srs";
import type { DueSummary, SrsCard } from "@/lib/srs-server";

/**
 * 単語の復習セッション。日本語 → 意味の一方向、採点は2択。
 *
 * ── めくってから採点 ────────────────────────────────────
 * 表に採点ボタンは出さない。答えを見ずに「覚えてた」を押せる作りにすると、
 * 記録が学習者自身の申告ですらなくなる。
 *
 * ── 1枚ごとに保存 ──────────────────────────────────────
 * 採点のたびに POST する。セッションの終わりまで溜めない。途中で閉じても
 * そこまでは残るし、「やめる」に確認を出す必要もなくなる。
 *
 * ⚠️ 触っていないもの: use_count / graduated_at（あれは「産出」の記録で、
 * ここが扱うのは「再認」）。api/tts と PlayButton の実装、既存の try_use_*、
 * ボトムナビ、既存の Review タブにも一切関わらない。
 */

type Phase = "asking" | "done" | "limit";

export function FlashcardSession({ initial }: { initial: DueSummary }) {
  const t = useT();

  const [cards] = useState<SrsCard[]>(initial.cards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>("asking");
  const [saving, setSaving] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const [correctCount, setCorrectCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [tomorrowCount, setTomorrowCount] = useState(0);
  const [graduatedCount, setGraduatedCount] = useState(0);

  /**
   * 音声はセッション全体で1つの枠を共有する。カードは常に1枚しか見えないので、
   * VocabularyList のように「どのカードに出すか」を持つ必要はない。
   */
  const [audioLimit, setAudioLimit] = useState<number | null>(null);

  const card = cards[index];
  const tomorrow = addDays(initial.today, 1);

  async function grade(correct: boolean) {
    if (!card || saving) return;
    setSaving(true);
    setCardError(null);
    try {
      const res = await fetch("/api/vocabulary/srs/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: card.id, correct }),
      });

      if (res.status === 429) {
        // 枠は取れていないので、このカードは採点されていない。進めずに終了画面へ。
        setPhase("limit");
        return;
      }
      if (res.status === 503) {
        setCardError(t("flashcards.unavailable"));
        return;
      }
      if (res.status === 409) {
        // 別のセッションが先に卒業させた。黙って次へ送る以外にできることがない。
        advance();
        return;
      }
      if (!res.ok) {
        setCardError(t("flashcards.saveFailed"));
        return;
      }

      const data = (await res.json()) as { dueOn: string | null; graduated: boolean };
      if (correct) setCorrectCount((n) => n + 1);
      else setMissCount((n) => n + 1);
      if (data.graduated) setGraduatedCount((n) => n + 1);
      if (data.dueOn === tomorrow) setTomorrowCount((n) => n + 1);
      advance();
    } catch {
      setCardError(t("flashcards.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function advance() {
    setRevealed(false);
    setCardError(null);
    if (index + 1 >= cards.length) setPhase("done");
    else setIndex((i) => i + 1);
  }

  // ── 空状態3種。どれも「今日は何もない」だが、意味が違うので器から変える ──
  if (cards.length === 0) {
    return <EmptyState summary={initial} />;
  }

  if (phase === "done") {
    return (
      <Wrapper>
        <div className="gloss-green rounded-[var(--radius-card)] p-6 text-center">
          <p className="text-2xl">🎉</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-cream">
            {t("flashcards.done.title")}
          </h2>
          <p className="mt-2 text-sm text-cream/90">
            {t("flashcards.done.score", { correct: correctCount, missed: missCount })}
          </p>
          {tomorrowCount > 0 && (
            <p className="mt-1 text-sm text-cream/75">
              {t("flashcards.done.tomorrow", { n: tomorrowCount })}
            </p>
          )}
          {graduatedCount > 0 && (
            <p className="mt-1 text-sm font-semibold text-cream">
              {t("flashcards.done.graduated", { n: graduatedCount })}
            </p>
          )}
        </div>
        <DoneLinks t={t} />
      </Wrapper>
    );
  }

  if (phase === "limit") {
    return (
      <Wrapper>
        <div className="gloss-panel rounded-[var(--radius-card)] p-6 text-center">
          <h2 className="font-serif text-xl font-bold text-pine">{t("flashcards.limitHit.title")}</h2>
          <p className="mt-2 text-sm text-ink/75">
            {t("flashcards.done.score", { correct: correctCount, missed: missCount })}
          </p>
          {/* 上限に当たったときの不安は「今やった分が消えたのでは」なので、
              保存済みであることを最初に言う。 */}
          <p className="mt-1 text-sm text-ink/70">{t("flashcards.limitHit.body")}</p>

          {/* Free のときだけ。Plus で使い切った人に Pro を勧めない — 差分は
              「無制限」だけで、30枚やり切った日にさらに勧める理由がない。
              NativeGate はプラン名と /upgrade を iOS シェルから外すため
              （App Store Guideline 3.1.1）。 */}
          {initial.plan === "free" && (
            <NativeGate>
              <Link
                href="/upgrade"
                className="mt-3 inline-block text-sm font-semibold text-moss-600 hover:text-pine"
              >
                {t("flashcards.emptyDone.upgrade")}
              </Link>
            </NativeGate>
          )}
        </div>
        <DoneLinks t={t} />
      </Wrapper>
    );
  }

  // ── 出題中 ────────────────────────────────────────────
  const wordText = safeRubyNotation(card.word, card.reading ?? "");
  // 採点が済んだ枚数。今めくっているカードはまだ数えない。
  const done = index;

  return (
    <Wrapper>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-pine">
            {t("flashcards.title")}
          </h1>
          <p className="text-xs text-muted">{t("flashcards.subtitle")}</p>
        </div>
        <Link href="/history?tab=vocab" className="shrink-0 text-xs font-semibold text-muted hover:text-pine">
          {t("flashcards.exit")}
        </Link>
      </div>

      {/* 進捗。GoalRing は使わない — あれは目標に対する充足率の部品で、これは
          通過中の位置。 */}
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-mint">
          <div
            className="h-full rounded-full bg-moss transition-[width] duration-200"
            style={{ width: `${Math.round((done / cards.length) * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-muted">
          {t("flashcards.progress", { done: index + 1, total: cards.length })}
        </p>
      </div>

      <Card accent="none" className="p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {card.jlpt_level && (
            <span className="rounded-full bg-pine px-2.5 py-0.5 text-xs font-bold text-cream">
              {card.jlpt_level}
            </span>
          )}
          {card.isNew && (
            <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold text-pine">
              {t("flashcards.newBadge")}
            </span>
          )}
        </div>

        {/* 表の語は裏でも消さない。答え合わせは対で見えているときにいちばん効く。 */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Furigana text={wordText} className="font-jp text-3xl font-bold text-pine" />
          <PlayButton
            text={wordText}
            kind="word"
            size="md"
            label={t("audio.playWord")}
            disabled={audioLimit !== null}
            onLimitReached={(limit) => setAudioLimit(limit)}
          />
        </div>
        {/* 既存の文言をそのまま使う。「一度聞いた文は何度でも無料」まで
            含んでいて、共有バケットのキャッシュがそれを実際に裏付けている。 */}
        {audioLimit !== null && <AudioLimitNotice limit={audioLimit} className="mt-2" />}

        {!revealed ? (
          <div className="mt-8">
            <Button className="w-full" onClick={() => setRevealed(true)}>
              {t("flashcards.reveal")}
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-4 border-t border-line/60 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-moss-600">
                {t("vocab.meaning")}
              </p>
              <p className="mt-1 text-lg leading-relaxed text-ink">
                <NoRuby text={card.meaning} />
              </p>
            </div>

            {/* 例文は畳まない。裏に着いた時点で答え合わせは済んでいるので、
                ここで1タップ増やす価値がない。器は support タブ・お題カードと
                同じミントのボックス。 */}
            {card.example_jp_ruby && (
              <div className="mt-4 rounded-xl bg-mint/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-moss-600">
                  {t("support.templateExample")}
                </p>
                <Furigana text={card.example_jp_ruby} className="font-jp text-[15px] text-ink" />
                {card.example_translation && (
                  <p className="mt-0.5 text-xs text-muted">{card.example_translation}</p>
                )}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="ghost" disabled={saving} onClick={() => grade(false)}>
                {t("flashcards.forgot")}
              </Button>
              <Button disabled={saving} onClick={() => grade(true)}>
                <Icon.check className="h-4 w-4" /> {t("flashcards.knew")}
              </Button>
            </div>
          </>
        )}

        {/* 枠は既に消えているので、同じカードで retry できるようにしておく。
            進めてしまうと今日の1枚を黙って失う。 */}
        {cardError && (
          <p className="mt-3 rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">{cardError}</p>
        )}
      </Card>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg space-y-4">{children}</div>;
}

/** 完了・上限のどちらからも同じ2本。最後に /write を置くのが loop の閉じ方。 */
function DoneLinks({ t }: { t: (k: string, v?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <LinkButton href="/history?tab=vocab" variant="ghost" size="sm">
        {t("flashcards.done.toVocab")}
      </LinkButton>
      <LinkButton href="/write" size="sm">
        <Icon.pen className="h-4 w-4" /> {t("flashcards.done.toWrite")}
      </LinkButton>
    </div>
  );
}

/**
 * 出題0枚の3状態。
 *
 * 一番下（期限が来ていない）は成功であって不足ではないので、gloss-green で
 * 描き、「ありません」ではなく「まだ新しい」と書く。上2つとは器から変える。
 */
function EmptyState({ summary }: { summary: DueSummary }) {
  const t = useT();

  // A. 単語帳がまだ空
  if (!summary.hasReviewable) {
    return (
      <Wrapper>
        <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-paper p-8 text-center">
          <p className="text-2xl">📖</p>
          <h2 className="mt-2 font-serif text-lg font-bold text-pine">
            {t("flashcards.emptyNoWords.title")}
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink/70">
            {t("flashcards.emptyNoWords.body")}
          </p>
          <LinkButton href="/write" size="sm" className="mt-4">
            <Icon.pen className="h-4 w-4" /> {t("flashcards.done.toWrite")}
          </LinkButton>
        </div>
      </Wrapper>
    );
  }

  // B. 今日ぶんを使い切った
  if (summary.dueRemaining > 0) {
    return (
      <Wrapper>
        <div className="gloss-panel rounded-[var(--radius-card)] p-6 text-center">
          <h2 className="font-serif text-lg font-bold text-pine">
            {t("flashcards.emptyDone.title")}
          </h2>
          <p className="mt-1 text-sm text-ink/70">
            {t("flashcards.emptyDone.body", { n: summary.dueRemaining })}
          </p>
          {summary.plan === "free" && (
            <NativeGate>
              <Link
                href="/upgrade"
                className="mt-3 inline-block text-sm font-semibold text-moss-600 hover:text-pine"
              >
                {t("flashcards.emptyDone.upgrade")}
              </Link>
            </NativeGate>
          )}
        </div>
        <DoneLinks t={t} />
      </Wrapper>
    );
  }

  // C. 期限が来ていない — 成功の状態
  return (
    <Wrapper>
      <div className="gloss-green rounded-[var(--radius-card)] p-6 text-center">
        <p className="text-2xl">🌱</p>
        <h2 className="mt-1 font-serif text-lg font-bold text-cream">
          {t("flashcards.emptyNothingDue.title")}
        </h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-cream/85">
          {summary.nextDueOn
            ? t("flashcards.emptyNothingDue.body", { date: summary.nextDueOn })
            : t("flashcards.emptyNothingDue.bodyNoDate")}
        </p>
      </div>
      <DoneLinks t={t} />
    </Wrapper>
  );
}
