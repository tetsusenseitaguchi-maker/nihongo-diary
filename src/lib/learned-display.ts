/**
 * Learned Items の表示側だけが使う、クライアント安全な小さな共有物。
 *
 * なぜ learned-match.ts から import しないか:
 * あちらは segmenter.ts を経由して TinySegmenter をモジュールスコープで
 * 生成する。副作用なので tree-shaking が効かず、定数1つのために
 * /write のクライアントバンドルへセグメンタ一式が入る。実測で
 * First Load JS が 312 kB → 321 kB（+9 kB）だった。
 *
 * そのため「値を写す」方針は変えないが、写す場所は1箇所に集約する。
 * SavedWordsRow と LearnedUsedPanel の両方がここを見るので、
 * 閾値が変わったときに直すのは learned-match.ts とこのファイルの2箇所だけ。
 *
 * ⚠️ learned-match.ts の GRADUATION_THRESHOLD と必ず同じ値にすること。
 */
export const GRADUATION_AT = 3;

/**
 * 添削直後に「使えた」として見せる1件。
 *
 * id / word / matchedText / useCount は /api/learned/scan のレスポンスそのまま。
 * reading と graduated はクライアント側で足す:
 *   reading   … scan は読みを返さない（返させるとルート変更になる）。
 *               書く画面が既に持っている単語リストから id で引いて補う。
 *               引けなければ null で、その語はふりがな無しで出る。
 *   graduated … scan のレスポンスの graduated 配列に id が含まれるか。
 *               「この保存でちょうど卒業した」ものだけ true になる。
 */
export interface UsedExpression {
  id: string;
  word: string;
  /** 日記に実際に出た形（例: 食べる → "食べました"）。 */
  matchedText: string;
  useCount: number;
  reading: string | null;
  graduated: boolean;
}
