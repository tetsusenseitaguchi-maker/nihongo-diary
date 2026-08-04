-- ============================================================
--  Nihongo Diary — 1日の復習枚数のユーザー設定
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑤ の順に1文ずつ実行する。
--
--  ⚠️ このファイルの末尾に ROLLBACK の記載があるが、実行しないこと。
--     すべてコメントとして書いてある。元に戻したいときだけ使う。
--
--  ── 何をする機能か ──────────────────────────────────────────
--  フラッシュカードの「1日に出す枚数」を、有料プランの学習者が自分で
--  選べるようにする。Free は 5 枚固定で変更できない。
--    Free … 5（固定）
--    Plus … 10 / 20 / 30       天井は 30
--    Pro  … 10 / 20 / 30 / 50 / 100 / 無制限
--
--  ── なぜ profiles に列を足さないのか ─────────────────────────
--  この設定は「プラン上限」と必ずセットで読む必要がある。profiles.plan を
--  読むクエリに同居させると、列が無い環境でその行ごとクエリが落ち、
--  normalizePlan(undefined) が全員を Free と判定する。過去に timezone 列で
--  実際に起きた事故と同じ形で、DailyReviewPushToggle.tsx:25-28 が
--  「plan を読むクエリに畳み込むな」と明記している。
--
--  daily_review_push が profiles の列でいられるのは、あれが plan と一緒に
--  読む必要のない設定だから。こちらは違うので、discovery_settings と同じく
--  テーブルを分ける。テーブルを分けておくと、SQL 未実行のままコードが出ても
--  「この1クエリだけが落ちてプラン既定にフォールバックする」で済む。
--
--  ── 関数は作らない ────────────────────────────────────────
--  ここは日次クォータではなく設定値なので、try_use_* のような
--  security definer 関数は要らない。
--
--  ⚠️ try_use_vocab_review は変更しない。あれは p_limit を引数で受ける形
--  なので、日中に上限が変わるケースを既に吸収している（下げた直後は
--  review_count < p_limit が偽になり、その日の残りが 0 になる）。
--
--  ── 上限の強制はどこで行われるか ──────────────────────────
--  DB ではなくアプリ側の読み取り時。src/lib/srs-limits.ts の
--  resolveReviewLimit() が min(希望, プラン上限) を計算する。
--  つまりこのテーブルに入る値は「希望」であって「権利」ではない。
--  クライアントが Plus のまま 100 を書き込んでも、実効値は 30 になる。
--  Pro → Plus のダウングレードで 100 が残っても同じ理由で安全。
--
--  touches: 新しいテーブルだけ。profiles / plan / Stripe / RevenueCat /
--  vocabulary_entries / vocabulary_srs / vocab_review_usage /
--  try_use_vocab_review / 既存の try_use_* / 既存トリガー には一切触らない。
-- ============================================================


-- ============================================================
--  ① 設定テーブル
-- ============================================================
-- daily_target の意味:
--   NULL          … 未設定 = プラン既定を使う。Pro の既定は「無制限」なので、
--                   Pro が UI で「無制限」を選んだときも NULL を書く。
--                   「一度も設定していない」と「明示的に無制限」は、どちらも
--                   プラン既定に解決されるので区別する必要がない。
--                   ⚠️ 無制限を大きな数値（99999 等）で表さないこと。null の
--                   ときアプリは RPC 自体を呼ばず、vocab_review_usage に行を
--                   作らない。数値にすると無制限のはずの学習者にカウンタ行が
--                   溜まり、ダウングレード時に残る。
--   1 以上の整数  … 学習者の希望値。プラン上限はここでは強制しない。
--
-- CHECK は明らかなゴミ（0・負数・桁違い）だけを弾く保険。実効上限はアプリが
-- 決める。0 を許してはいけない — try_use_vocab_review は p_limit <= 0 で常に
-- false を返すので、復習が黙って死ぬ。
create table if not exists public.vocab_review_settings (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  daily_target integer     check (daily_target is null or (daily_target >= 1 and daily_target <= 1000)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);


-- ============================================================
--  ② RLS 有効化
-- ============================================================
alter table public.vocab_review_settings enable row level security;


-- ============================================================
--  ③ ポリシー削除（③④はセットで実行する）
-- ============================================================
-- 先に消してから作る。permissive なポリシーは OR で足し合わされるので、
-- 名前違いのものを二重に作ると権限が広がりうる。
drop policy if exists "Read own review settings"   on public.vocab_review_settings;
drop policy if exists "Insert own review settings" on public.vocab_review_settings;
drop policy if exists "Update own review settings" on public.vocab_review_settings;


-- ============================================================
--  ④ ポリシー作成
-- ============================================================
-- discovery_settings と同じ3本立て。delete は許さない — 「無制限に戻す」は
-- 行を消すのではなく daily_target を NULL に update して表現する。
--
-- ⚠️ ここが insert / update を許すのは意図どおり。これは学習者本人の設定で、
-- 日次クォータ（vocab_review_usage、select のみ）とは性質が違う。
-- 書き換えられて困る値ではない — 上限の強制は読み取り時のクランプが担う。
create policy "Read own review settings"
  on public.vocab_review_settings for select using (auth.uid() = user_id);

create policy "Insert own review settings"
  on public.vocab_review_settings for insert with check (auth.uid() = user_id);

create policy "Update own review settings"
  on public.vocab_review_settings for update
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  ⑤ PostgREST にスキーマを読み直させる
-- ============================================================
-- これを流すまで、このテーブルは select も insert もできない。
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑤ を流したあとに実行・読み取りのみ）
-- ============================================================
-- (1) テーブルができていること
--   SELECT column_name, data_type, is_nullable
--   FROM   information_schema.columns
--   WHERE  table_schema = 'public' AND table_name = 'vocab_review_settings'
--   ORDER  BY ordinal_position;
--   期待: user_id/uuid/NO, daily_target/integer/YES,
--         created_at/timestamptz/NO, updated_at/timestamptz/NO
--
-- (2) ポリシーが3本あること
--   SELECT policyname, cmd FROM pg_policies
--   WHERE  schemaname = 'public' AND tablename = 'vocab_review_settings'
--   ORDER  BY policyname;
--   期待: Insert own review settings / INSERT
--         Read own review settings   / SELECT
--         Update own review settings / UPDATE
--
-- (3) ★重要★ plan 関連の列が無傷であること
--   SELECT column_name FROM information_schema.columns
--   WHERE  table_schema = 'public' AND table_name = 'profiles'
--     AND  (column_name LIKE '%plan%' OR column_name LIKE '%stripe%'
--           OR column_name LIKE '%revenuecat%')
--   ORDER  BY column_name;
--   期待: 実行前と同じ一覧。このファイルは profiles に触っていないので
--         変わっていたら別の原因。
--
-- (4) 既存の SRS まわりが無傷であること
--   SELECT proname FROM pg_proc WHERE proname = 'try_use_vocab_review';
--   期待: 1行（このファイルは関数を作らないし変えない）
--
-- (5) まだ誰も設定していないこと
--   SELECT count(*) FROM public.vocab_review_settings;
--   期待: 0
--
--
-- ============================================================
--  ROLLBACK（実行しないこと。戻すときだけコメントを外す）
-- ============================================================
--   DROP TABLE IF EXISTS public.vocab_review_settings;
--   NOTIFY pgrst, 'reload schema';
--
--   このテーブルを消すと全員が daily_target = NULL 相当になり、
--   プラン既定（Free 5 / Plus 30 / Pro 無制限）に戻る。学習の進捗
--   （vocabulary_srs）にも当日のカウント（vocab_review_usage）にも
--   影響しない。
-- ============================================================
