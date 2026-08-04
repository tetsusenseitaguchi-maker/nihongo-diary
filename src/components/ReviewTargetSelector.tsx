"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NativeGate } from "@/components/NativeGate";
import { useT } from "@/contexts/locale";
import { normalizePlan } from "@/lib/plans";
import {
  REVIEW_DAILY_LIMITS,
  REVIEW_TARGET_PRESETS_PLUS,
  REVIEW_TARGET_PRESETS_PRO,
} from "@/lib/srs-limits";

/**
 * 「1日に出すフラッシュカードの枚数」。
 *
 * ── 保存値は希望であって権利ではない ────────────────────────────
 * ここが書くのは vocab_review_settings.daily_target だけで、上限の強制は
 * サーバー側の resolveReviewLimit() が読み取り時に行う。つまりこのチップが
 * プランごとに選択肢を絞るのは親切のためであって、これが防御ではない。
 * Plus の学習者が細工して 100 を保存しても、実効値は 30 のままになる。
 *
 * ── 「無制限」は null ────────────────────────────────────────
 * Pro が Unlimited を選んだときは daily_target に NULL を書く。大きな数値を
 * 入れないこと — null のときサーバーは RPC 自体を呼ばず、vocab_review_usage
 * に行を作らない。数値にすると無制限のはずの学習者にカウンタ行が溜まる。
 * 「未設定」と「明示的に無制限」はどちらもプラン既定に解決されるので、
 * 区別する必要がない。
 *
 * ── Free には見せる ────────────────────────────────────────
 * 隠すと機能の存在を知る手段が無くなる。無効化したチップと、プランの話を
 * <NativeGate> で囲んだ一行を出す（App Store Guideline 3.1.1 — iOS シェルに
 * プラン名と /upgrade を出さない）。
 *
 * ── 保存 ────────────────────────────────────────────────
 * 即時。/profile のどの設定にも保存ボタンは無い。DailyReviewPushToggle と
 * 同じ idle → saving → saved → error の4状態で、失敗したら表示を元に戻す —
 * 書けなかった値が選ばれたまま残ると、画面が DB の持たない状態を映す。
 */

/** Unlimited を選んだことを表す番兵。DB には NULL を書く。 */
const UNLIMITED = "unlimited" as const;
type Choice = number | typeof UNLIMITED;

export function ReviewTargetSelector({
  userId,
  plan: rawPlan,
  initialTarget,
}: {
  userId: string;
  plan: string | null | undefined;
  /** vocab_review_settings.daily_target。未設定は null。 */
  initialTarget: number | null;
}) {
  const t = useT();
  const plan = normalizePlan(rawPlan);
  const ceiling = REVIEW_DAILY_LIMITS[plan];
  const isFree = plan === "free";
  const isPro = ceiling === null;

  // null（未設定）は「プラン既定」。Pro の既定は無制限なので Unlimited、
  // それ以外は天井の数値が選ばれて見える。
  const initialChoice: Choice = initialTarget ?? (isPro ? UNLIMITED : (ceiling ?? 5));

  const [choice, setChoice] = useState<Choice>(initialChoice);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const options: Choice[] = isFree
    ? [ceiling ?? 5]
    : isPro
      ? [...REVIEW_TARGET_PRESETS_PRO, UNLIMITED]
      : [...REVIEW_TARGET_PRESETS_PLUS];

  async function pick(next: Choice) {
    if (isFree || status === "saving" || next === choice) return;

    const previous = choice;
    setChoice(next);
    setStatus("saving");

    const supabase = createClient();
    const { error } = await supabase.from("vocab_review_settings").upsert(
      {
        user_id: userId,
        daily_target: next === UNLIMITED ? null : next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setChoice(previous);
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("profile.review.title")}>
        {options.map((opt) => {
          const active = opt === choice;
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() => pick(opt)}
              disabled={isFree || status === "saving"}
              aria-pressed={active}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-moss bg-mint text-pine"
                  : "border-line bg-paper text-ink/70 hover:border-moss hover:bg-mint/40"
              } ${isFree ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {opt === UNLIMITED ? t("profile.review.unlimited") : opt}
            </button>
          );
        })}
      </div>

      {/* Free。プランの話は NativeGate の中だけ。 */}
      {isFree && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span>{t("profile.review.freeNote")}</span>
          <NativeGate>
            <Link href="/upgrade" className="font-semibold text-moss-600 hover:text-pine">
              {t("profile.review.freeUpgrade")}
            </Link>
          </NativeGate>
        </p>
      )}

      {/* 下げた当日は残りが 0 になりうる（vocab_review_usage の当日ぶんは
          書き換わらない）。専用の警告画面を作るほどではないので一行だけ。 */}
      {!isFree && <p className="mt-2 text-xs text-muted">{t("profile.review.note")}</p>}

      {/* 状態の3行は DailyReviewPushToggle と同じ見た目・同じ持ち方。文言を
          あちらのキーで使い回さないのは、片方の言い回しを直したときにもう片方が
          黙って変わるのを避けるため。 */}
      {status === "saving" && (
        <p className="mt-2 text-xs text-muted">{t("profile.review.saving")}</p>
      )}
      {status === "saved" && (
        <p className="mt-2 text-xs font-semibold text-moss-600">✓ {t("profile.review.saved")}</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs font-semibold text-red-600">{t("profile.review.error")}</p>
      )}
    </div>
  );
}
