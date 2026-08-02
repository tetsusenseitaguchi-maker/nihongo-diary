-- ============================================================
--  Nihongo Diary — 翌朝の復習通知をオフにできるようにする
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜② の順に1文ずつ実行する。
--
--  なぜ通知より先に作るのか:
--    毎日届く通知に、アプリ内で止める手段が無い状態で出してはいけない。
--    止めたい人が取れる手段が iOS の設定しか無いと、そこで切られる。
--    OS 側で切られると、フォロー・コメント・リアクションといった既存の
--    通知まで全部届かなくなる。1つの機能のために全部を失う形になるので、
--    列とトグルは通知本体と同時か、それより先に入れる。
--
--  設計:
--    - profiles に nullable でない boolean を1列足すだけ。
--    - plan / Stripe / RevenueCat の列には触らない。
--    - profiles の既存 RLS ポリシーには触らない。本人更新のポリシー
--      "Users can update their own profile"（schema.sql:29）が既にあるので、
--      トグルはそれで動く。新しいポリシーは要らない。
--    - 既存トリガーは追加も変更もしない。
--    - pg_cron のスケジュール登録はここに入れない。呼び出し先のルートも
--      秘密鍵もまだ存在しないため。通知を実装する段で別ファイルにする。
--
--  ⚠️ profiles を触るときの過去の事故:
--     timezone 列が存在しないまま select に含めてしまい、クエリ全体が
--     エラーになって profile が null になり、normalizePlan(undefined) が
--     全員を Free と判定した。今回は ADD するだけなので同じ事故は
--     起きないが、この列を select に加えるコードを書くときは、
--     ①を流し終えてからにすること。
-- ============================================================


-- ============================================================
--  ① 列を追加
-- ============================================================
-- 既定は true（通知を受け取る）。オプトアウトなので、既存ユーザーは
-- 何もしなくても対象に入る。
--
-- ⚠️ 既定が true でも、これだけで通知が飛ぶわけではない。実際に届く条件は
--    「この列が true」かつ「profiles.push_token がある」かつ
--    「iOS で通知を許可済み」。push_token は Capacitor の
--    ネイティブシェルでしか登録されない（PushRegistrar.tsx:24-25）ので、
--    ブラウザだけの学習者はこの列に関わらず対象外になる。
--    その人たちにはダッシュボードの導線が代わりになる。
--
-- NOT NULL かつ定数の DEFAULT を持つ列の追加は、PostgreSQL 11 以降では
-- メタデータだけの変更で済む（テーブルの書き換えも長いロックも起きない）。
-- 既存行はすべて true として読み出される。
alter table public.profiles
  add column if not exists daily_review_push boolean not null default true;


-- ============================================================
--  ② PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
-- これを流すまで、この列は select も update もできない。
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜② を流したあとに実行）
-- ============================================================
-- (1) 列が増えていること
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles'
--     AND column_name='daily_review_push';
--   期待: daily_review_push / boolean / NO / true
--
-- (2) 既存ユーザーが全員 true になっていること
--   SELECT daily_review_push, count(*) FROM public.profiles
--   GROUP BY daily_review_push;
--   期待: true が全件、false は0件（まだ誰も切っていない）
--
-- (3) ★重要★ plan 関連の列が無傷であること
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles'
--     AND (column_name LIKE '%plan%' OR column_name LIKE '%stripe%'
--          OR column_name LIKE '%revenuecat%')
--   ORDER BY column_name;
--   期待: 実行前と同じ一覧。1つでも消えていたら即座に止めること。
--
-- (4) 既存ポリシーが無傷であること（新しいポリシーは作っていない）
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='profiles' ORDER BY policyname;
--   期待: 実行前と同じ3本
--         （viewable by everyone / update their own / insert their own）
--
-- (5) トリガーが増えていないこと
--   SELECT tgname FROM pg_trigger
--   WHERE tgrelid='public.profiles'::regclass AND NOT tgisinternal
--   ORDER BY tgname;
--   期待: 実行前と同じ一覧。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS daily_review_push;
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ 列を落とすと、通知を切っていた学習者の設定が失われる。戻したときには
--    全員 true から再開する（＝切っていた人にまた届く）。通知本体が
--    動いている状態でこれを流さないこと。
--
-- ⚠️ この列を select に含めているコードが残ったまま列を落とすと、
--    過去の timezone 事故と同じ形になる。クエリ全体がエラーになり、
--    profile が null になり、normalizePlan(undefined) で全員が Free 扱いに
--    なる。ロールバックはアプリ側の参照を先に外してから。
-- ============================================================
