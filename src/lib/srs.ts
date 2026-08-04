/**
 * 単語の間隔反復（SRS）— 段階と次回日付の計算。
 *
 * 純関数だけ。DB にも React にも next/headers にも依存しないので、ルートから
 * もクライアントからも単体の Node スクリプトからもそのまま呼べる。
 *
 * ── ここが持つもの / 持たないもの ────────────────────────────
 * 持つ: 段階の日数表と遷移規則、日付の加算。
 * 持たない: プランごとの1日の枚数（src/lib/srs-limits.ts）、出題の選び方
 *           （api/vocabulary/srs）、DB の形（supabase/add-vocab-srs.sql）。
 *
 * ⚠️ 変更禁止ロジックには一切触れていない。use_count / graduated_at /
 * learned-match.ts / normalizePlan / buildRubyNotation は import も参照も
 * していない。ここが計算するのは「再認（意味が言える）」の進み具合で、
 * あちらが記録しているのは「産出（日記で自分で使えた）」。別の軸なので、
 * 同じ語について両方が同時に進む。
 */

/**
 * stage 1..5 に対応する日数。index = stage - 1。
 *
 * 固定5段階。学習者の答えの「自信度」で間隔が変わる方式（Anki の
 * Again/Hard/Good/Easy）は採らない — 採点が2択だから、間隔を分ける材料が
 * そもそも無い。段階を増やすならこの配列に足すだけで、DB は変わらない。
 */
export const SRS_STAGE_DAYS = [1, 3, 7, 14, 30] as const;

/** 卒業。この段階に達した語は二度と出題されない。 */
export const SRS_GRADUATED_STAGE = SRS_STAGE_DAYS.length + 1; // 6

/**
 * 新規。vocabulary_srs に行が無い語も、行はあるがまだ採点されていない語も
 * これ。DB 側の default と同じ値であること。
 */
export const SRS_NEW_STAGE = 0;

/**
 * 誤答で戻れる下限。
 *
 * ⚠️ 0 にしてはいけない。0 は「新規」= due_on が今日のままになる段階なので、
 * 間違えた語がその場でまた出題対象に戻り、同じセッションの中で延々と回る。
 * 1 で床にすると、間違えた語は必ず「翌日もう一度」になる — これが「1段階
 * 戻る」の実質的な意味であり、間隔反復として意図している挙動でもある。
 */
export const SRS_MIN_STAGE_AFTER_MISS = 1;

/**
 * "YYYY-MM-DD" に日数を足して "YYYY-MM-DD" を返す。
 *
 * date-tz.ts の previousDay() と同じ方式：文字列を UTC 深夜として読み、UTC
 * のまま日をずらす。タイムゾーンも夏時間の切り替わりも結果を動かさない。
 * 入力は todayInTZ() が作った学習者のローカル日付で、時刻は持たないし要らない。
 *
 * date-tz.ts に置かずここに置いてあるのは、あのファイルが streak と診断系に
 * 共有されているため。SRS のためだけの関数を足して、あちらの読む面を広げる
 * 理由がない。
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 採点1回ぶんの結果。DB に書き戻す値そのもの。 */
export interface SrsTransition {
  /** 次の段階。SRS_GRADUATED_STAGE なら卒業。 */
  stage: number;
  /** 次に出す日。卒業したら null（= 二度と出さない）。 */
  dueOn: string | null;
  /** 卒業した瞬間かどうか。UI の演出と srs_graduated_at の書き込みに使う。 */
  graduated: boolean;
}

/**
 * 今の段階と正誤から、次の段階と次回日付を出す。
 *
 * `today` は todayInTZ(tz) が返した学習者のローカル日付を渡すこと。サーバーの
 * new Date() を渡してはいけない — Vercel は UTC なので、東の学習者の「今日」
 * とずれる。過去に全ユーザーの streak がずれた事故と同じ形。
 *
 * 卒業済み（stage >= SRS_GRADUATED_STAGE）を渡した場合は、正誤に関わらず
 * 卒業のまま返す。出題側が卒業行を除外しているので通常は起こらないが、
 * ここで倒しておけば「卒業した語が誤答で復活する」経路が存在しなくなる。
 */
export function nextSrsState(
  currentStage: number,
  correct: boolean,
  today: string,
): SrsTransition {
  if (currentStage >= SRS_GRADUATED_STAGE) {
    return { stage: SRS_GRADUATED_STAGE, dueOn: null, graduated: false };
  }

  const stage = correct
    ? Math.min(SRS_GRADUATED_STAGE, currentStage + 1)
    : Math.max(SRS_MIN_STAGE_AFTER_MISS, currentStage - 1);

  if (stage >= SRS_GRADUATED_STAGE) {
    return { stage: SRS_GRADUATED_STAGE, dueOn: null, graduated: true };
  }

  return { stage, dueOn: addDays(today, SRS_STAGE_DAYS[stage - 1]), graduated: false };
}

/**
 * 出題対象になりうる単語帳の行か。
 *
 * entry_type = 'word' だけ。文法パターンは対象外 — api/learned/scan が同じ
 * 理由で除外しているのに加えて、こちらは「日本語 → 意味」の一問一答なので、
 * 〜てから のようなパターンは問いとして成立しない。
 *
 * meaning === word を弾くのは、意味の生成に失敗した行を出さないため。
 * api/vocabulary は AI が落ちていると meaning に word 自身を入れて保存する
 * （route.ts の `meaning: meaning || word`）ので、そのまま出すと「買い物 →
 * 買い物」という答えの無いカードになる。
 */
export function isReviewable(entry: { entry_type?: string | null; word: string; meaning: string }): boolean {
  if ((entry.entry_type ?? "word") !== "word") return false;
  if (!entry.meaning || !entry.word) return false;
  return entry.meaning.trim() !== entry.word.trim();
}
