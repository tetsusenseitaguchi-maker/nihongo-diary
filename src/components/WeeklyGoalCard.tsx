"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { WEEKLY_GOAL_ANCHOR_ID } from "@/components/DailyRecapOverlay";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

/**
 * 「今週は何日書くか」。ダッシュボードの主役で、ストリークはその下の1行。
 *
 * ── なぜ週目標が大きく、ストリークが小さいのか ──────────────────
 * ストリークは1日休んだ瞬間に折れる。週目標は折れない — 火曜に休んでも
 * 木曜と金曜で取り返せる。実測では、アクティブな週883件のうち57.4%が
 * 「その週1日だけ」で、3日以上に届くのは28.3%しかない。毎日書くことを
 * 前提にした指標を主役に据えると、ほとんどの学習者にとって主役は
 * 「折れた数字」になる。だから並べて、大小を入れ替える。
 *
 * ストリークの値は読むだけ。lib/streak.ts にも layout.tsx のインライン
 * 複製にも触れていない。ここがしているのは stats.currentStreak を小さい
 * 文字で描くことだけ。
 *
 * ── 未設定は「行が無い」 ────────────────────────────────────
 * target が null なら数字を一切出さず、選択導線だけを出す。0/3 のような
 * 数字を勝手に見せない — 選ぶ行為そのものが約束なので、選んでいない人に
 * 達成率を突きつけると、約束していないことに対する未達を見せることになる。
 *
 * ── 目標は引き継ぐ ────────────────────────────────────────
 * 週が変わっても目標は失効しない。リセットされるのは達成日数だけで、
 * それは毎レンダリング diary_date から導出される — cron もバッチも状態
 * 遷移も無い。「毎週選び直す」案は見送った: 週1日の学習者が57.4%を占める
 * 以上、選び直しを必須にすると、その人たちはほぼ毎回選択画面を見ることに
 * なり、進捗カードにたどり着けない。
 *
 * ── 保存 ────────────────────────────────────────────────
 * ReviewTargetSelector と同じ。API ルートもサーバーアクションも作らず、
 * ブラウザから upsert して RLS が認可する（weekly_goals は本人のみ
 * select/insert/update/delete）。失敗したら表示を元に戻す — 書けなかった
 * 値が選ばれたまま残ると、画面が DB の持たない状態を映す。
 */

/** アプリが出す選択肢。DB の CHECK は 1..7 と広い（週2日を足す余地）。 */
const GOAL_OPTIONS = [3, 5, 7] as const;

export function WeeklyGoalCard({
  userId,
  initialTarget,
  daysThisWeek,
  currentStreak,
}: {
  userId: string;
  /** weekly_goals.target_days。行が無ければ null = 未設定。 */
  initialTarget: number | null;
  /** 今週の diary_date のユニーク数。サーバーで数え済み。 */
  daysThisWeek: number;
  /** 表示のみ。計算には一切関与しない。 */
  currentStreak: number;
}) {
  const t = useT();
  const [target, setTarget] = useState<number | null>(initialTarget);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function pick(next: number) {
    if (status === "saving") return;
    const previous = target;
    setTarget(next);
    setEditing(false);
    setStatus("saving");

    const supabase = createClient();
    const { error } = await supabase.from("weekly_goals").upsert(
      { user_id: userId, target_days: next, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

    if (error) {
      setTarget(previous);
      setStatus("error");
      return;
    }
    setStatus("idle");
  }

  // ドットは目標のぶんだけ並べ、達成ぶんを塗る。超過は塗り切りで止める —
  // 目標より多く書いた週に「4/3日」と出すのは、約束を守った人に算数の
  // 違和感を渡すことになる。
  const filled = target ? Math.min(daysThisWeek, target) : 0;

  const streakLine = (
    <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2 text-xs text-muted">
      <Icon.flame className="h-3.5 w-3.5 text-apricot" />
      <span>{t("weeklyGoal.streak", { n: currentStreak })}</span>
    </div>
  );

  const chooser = (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("weeklyGoal.chooseAria")}>
      {GOAL_OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          disabled={status === "saving"}
          onClick={() => pick(n)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            n === target
              ? "bg-pine text-cream"
              : "border border-line bg-paper text-ink/70 hover:border-moss hover:text-pine"
          }`}
        >
          {n === 7 ? t("weeklyGoal.everyDay") : t("weeklyGoal.nDays", { n })}
        </button>
      ))}
    </div>
  );

  return (
    <Card accent="apricot" className="col-span-2 p-4" id={WEEKLY_GOAL_ANCHOR_ID}>
      {target === null || editing ? (
        <>
          <p className="font-serif text-base font-bold text-pine">{t("weeklyGoal.setTitle")}</p>
          <p className="mt-0.5 text-xs text-muted">{t("weeklyGoal.setBody")}</p>
          {chooser}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-muted">{t("weeklyGoal.title")}</p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 text-xs font-semibold text-moss-600 hover:text-pine"
            >
              {t("weeklyGoal.change")}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-1.5" aria-hidden>
              {Array.from({ length: target }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 shrink-0 rounded-full ${
                    i < filled ? "bg-pine" : "border border-line bg-paper"
                  }`}
                />
              ))}
            </div>
            <p className="font-serif text-3xl font-bold leading-none text-pine">
              {daysThisWeek}
              <span className="text-lg">{t("weeklyGoal.outOf", { n: target })}</span>
            </p>
          </div>
        </>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs font-semibold text-red-600">{t("weeklyGoal.saveError")}</p>
      )}
      {streakLine}
    </Card>
  );
}
