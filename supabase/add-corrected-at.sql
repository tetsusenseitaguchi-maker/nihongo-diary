-- ============================================================
--  Nihongo Diary — 添削した日時（corrected_at）
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①→② の順に1文ずつ実行する。
--
--  目的:
--    履歴（/diary/[id]）で Free ユーザーの添削結果をブラーするために、
--    「いつ添削したか」を知る必要がある。添削当日は全部見えて、
--    翌日以降はブラー、という規則の基準日になる列。
--
--  ⚠️ この列を足す前にアプリを先にデプロイしないこと。
--     correctionToDbColumns() が corrected_at を書くようになるので、
--     列が無い状態でデプロイすると添削の保存そのものが失敗する。
--     順番は「① と ② を実行 → アプリをデプロイ」。
--
--  ── なぜ既存の列では駄目なのか ──────────────────────────────
--
--  created_at:
--    日記を作った日。初回添削は作成と同時なので一致するが、再添削
--    （/api/correct-existing）では一致しない。そして再添削は
--    try_use_correction() を呼ぶ — つまり Free ユーザーの1日1回の
--    添削枠を消費する。created_at を基準にすると、1週間前の日記を
--    再添削した Free ユーザーは、唯一の枠を使ったうえで結果を
--    即座にブラーされる。枠を取って読ませないことになるので却下。
--
--  updated_at:
--    schema.sql の diary_entries_set_updated_at トリガーが、UPDATE
--    のたびに now() を入れる。添削と無関係な更新が6箇所ある:
--      image_path / audio_path（write/page.tsx）
--      翻訳キャッシュ（api/translate）
--      日記の編集（api/diary/[id]）
--      公開トグル（PublicToggle.tsx）
--      音読の録音（ShadowingStep.tsx）
--    公開トグルを1回押すだけで履歴のブラーが全部外れる。逆に、
--    録音しただけで意図せず解除される。基準として成立しない。
--
--  ── 触らないもの ────────────────────────────────────────────
--    - created_at / updated_at とそのトリガーは変更しない。
--    - correction_count / translation_count / recheck_count は触らない。
--    - try_use_correction() / refund_correction() は触らない。
--    - profiles / plan / normalizePlan / Stripe / streak には触らない。
--    - RLS ポリシーは追加も変更もしない。diary_entries の既存ポリシーが
--      そのまま新しい列にも効く（列単位の権限は使っていない）。
--    - インデックスは作らない。/diary/[id] は id で1行読むだけで、
--      corrected_at で絞り込む問い合わせはどこにも無い。
-- ============================================================


-- ① 列を追加する。
--    NULL 許容。添削されていない日記（下書き・ピア添削待ち）は
--    corrected_at を持たないのが正しい状態で、アプリ側はその場合
--    ブラーしない（隠すべき添削結果がそもそも無い）。
alter table public.diary_entries
  add column if not exists corrected_at timestamptz;


-- ② 既存行を埋める。
--    添削済みの行だけが対象。初回添削は作成と同時なので、既存行に
--    ついては created_at が実際の添削時刻とほぼ一致する。過去に
--    再添削された行は本当の再添削時刻より古い値が入るが、それらは
--    どのみち「翌日以降」に該当するので表示は変わらない。
--
--    corrected_japanese が null の行（未添削）は意図的に NULL のまま。
--
--    where corrected_at is null が付いているので、2回目以降の実行は
--    0行更新になる（①で追加済みの列を上書きしない）。
update public.diary_entries
   set corrected_at = created_at
 where corrected_at is null
   and corrected_japanese is not null;


-- ── 確認用（実行しなくてもよい）────────────────────────────
-- 埋まった件数と、未添削で NULL のまま残っている件数:
--
--   select
--     count(*) filter (where corrected_at is not null) as 添削済み,
--     count(*) filter (where corrected_at is null)     as 未添削,
--     count(*)                                          as 全体
--   from public.diary_entries;
--
-- 未添削なのに corrected_at が入っている行（0 であるべき）:
--
--   select count(*) from public.diary_entries
--    where corrected_at is not null and corrected_japanese is null;
