-- ============================================================
--  Nihongo Diary — 決済 webhook の記録テーブル（段階0：観測のみ）
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜③ の順に1文ずつ実行する。
--
--  ── なぜ要るのか ────────────────────────────────────────────
--  /api/stripe/webhook と /api/revenuecat/webhook は profiles.plan を
--  更新するが、その結果を受け取っていない。失敗の仕方が3つあり、どれも
--  無言で 200 を返す:
--
--    1. DB がエラーを返す        → 握りつぶして 200。Stripe は再送しない
--    2. .eq() が0行にマッチ      → そもそもエラーですらない
--    3. 例外が飛ぶ               → catch が console.error だけして 200
--
--  2 が最も危険。Stripe 側は checkout.session.completed が
--  stripe_customer_id を書くまで profiles にその顧客の行が無く、
--  customer.subscription.updated が先に届くと誰にも当たらない。
--  払ったのに free のまま、という結末が、どこにも記録されずに起きうる。
--
--  ── このファイルがやらないこと ──────────────────────────────
--  挙動は何も変えない。webhook は今までどおり全て 200 を返す。ここで
--  作るのは「何が起きたか」を後から読める場所だけ。500 を返すかどうかの
--  判断は、このテーブルに1〜2週間ぶんの実績が溜まってから決める
--  （段階2）。レースが週に0回なら、500 は入れないという判断もありうる。
--
--  ── 設計 ────────────────────────────────────────────────
--    - 追記専用。webhook は insert しかしない。
--    - 記録の失敗は決済処理を巻き込まない。recordBillingEvent()
--      (src/lib/billing-events.ts) は例外を外に出さない。このテーブルが
--      まだ無い状態でコードが先にデプロイされても、ログが1行出るだけで
--      決済は今までどおり通る。順序を気にせず流してよい。
--    - profiles / plan / normalizePlan / try_use_* / usage_limits /
--      audio_usage_daily / Stripe・RevenueCat の判定ロジックには触らない。
--    - unique 制約を「置かない」。段階0では再送でイベントが2回届いたこと
--      自体が読みたい情報で、弾いてしまうと見えなくなる。冪等性を DB で
--      担保するなら段階2以降に (provider, event_id) の unique を足す。
-- ============================================================


-- ============================================================
--  ① 記録テーブル
-- ============================================================
-- user_id は「webhook が誰に当てられたか」。当てられなかったときは null で、
-- それこそが読みたい行になる。customer_id / app_user_id は当たらなかった
-- ときに手がかりとして残す唯一の値なので、user_id とは別に持つ。
--
-- on delete set null: 退会後も監査の行は残す。決済の記録が、退会と一緒に
-- 消えてよいものだったことは一度もない。
create table if not exists public.billing_events (
  id               bigint generated always as identity primary key,
  provider         text not null check (provider in ('stripe', 'revenuecat')),
  event_id         text,
  event_type       text not null,
  customer_id      text,
  user_id          uuid references auth.users (id) on delete set null,
  outcome          text not null check (outcome in ('applied', 'no_match', 'db_error', 'exception')),
  rows_affected    integer,
  plan_after       text,
  detail           text,
  event_created_at timestamptz,
  created_at       timestamptz not null default now()
);

-- 読み方は2通りしかない。新しい順に眺めるか、outcome で絞るか。
create index if not exists billing_events_created_at_idx on public.billing_events (created_at desc);
create index if not exists billing_events_outcome_idx    on public.billing_events (outcome, created_at desc);


-- ============================================================
--  ② RLS を有効化（ポリシーは1本も作らない）
-- ============================================================
-- daily_review_sends と同じ形。書くのも読むのもサービスロールだけで、
-- サービスロールは RLS を通らない。ポリシーが無いということは、
-- クライアントから見ると存在しないのと同じになる。
--
-- ⚠️ 中身は決済の履歴で、customer_id と user_id の対応が入る。
--    authenticated から読めてよいものではない。
alter table public.billing_events enable row level security;


-- ============================================================
--  ③ 権限
-- ============================================================
-- RLS があるので厳密には不要だが、明示しておく。
revoke all on table public.billing_events from public, anon, authenticated;
grant select, insert on table public.billing_events to service_role;


-- ============================================================
--  VERIFY — 適用直後
-- ============================================================
--   SELECT column_name, data_type, is_nullable
--   FROM   information_schema.columns
--   WHERE  table_schema = 'public' AND table_name = 'billing_events'
--   ORDER  BY ordinal_position;
--   -- 期待: 12列（id, provider, event_id, event_type, customer_id, user_id,
--   --            outcome, rows_affected, plan_after, detail,
--   --            event_created_at, created_at）
--
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.billing_events'::regclass;
--   -- 期待: true
--
--   SELECT count(*) FROM pg_policies WHERE tablename = 'billing_events';
--   -- 期待: 0（ポリシーを作らないのが設計）


-- ============================================================
--  VERIFY — デプロイ後（決済が動いたとき）
-- ============================================================
--   -- 直近1週間の内訳。ここが読みたかったもの
--   SELECT outcome, provider, count(*)
--   FROM   public.billing_events
--   WHERE  created_at > now() - interval '7 days'
--   GROUP  BY 1, 2 ORDER BY 3 DESC;
--   -- applied   … 正常に1行更新できた
--   -- no_match  … 0行。レース（顧客IDに対応する行がまだ無い）か、
--   --              apple_iap / stripe ガードによる意図的な除外か、退会済み。
--   --              段階0ではこの3つを区別していない（段階1の仕事）
--   -- db_error  … DB がエラーを返した
--   -- exception … 例外が飛んだ
--
--   -- no_match の中身を見る。段階2に進む価値があるかはこの行数で決まる
--   SELECT created_at, provider, event_type, customer_id, detail
--   FROM   public.billing_events
--   WHERE  outcome <> 'applied'
--   ORDER  BY created_at DESC LIMIT 50;
--
--   -- 同じイベントが複数回届いていないか（再送の実績）
--   SELECT provider, event_id, count(*)
--   FROM   public.billing_events
--   WHERE  event_id IS NOT NULL
--   GROUP  BY 1, 2 HAVING count(*) > 1;
--
--   判断: no_match が2週間で0件なら、段階2（500を返す）は見送ってよい。
--   1件でも出たら、その1件が「払ったのに free」の候補になる。


-- ============================================================
--  ROLLBACK
-- ============================================================
--   DROP TABLE IF EXISTS public.billing_events;   -- インデックスも一緒に消える
--
--   ⚠️ コード側を先に戻すこと。テーブルだけ落としても
--      recordBillingEvent() は例外を外に出さないので決済は止まらないが、
--      毎回 console.error が出る。


-- ============================================================
--  NOTE — 保持期間
-- ============================================================
-- 自動削除は入れていない。決済イベントの量（現在の有料ユーザーは10人）
-- からして、放っておいて困る速度では増えない。増えてきたら
--   delete from public.billing_events where created_at < now() - interval '180 days';
-- を手で流すか、pg_cron に載せる。監査の行なので、消す判断は自動化より
-- 手で決めたほうがよい。


-- ============================================================
--  NOTE — profiles.updated_at が更新されていない（別件・未調査）
-- ============================================================
-- このテーブルを作る理由の半分は、時刻の手がかりが他に無いこと。
--
-- 2026-08-03 時点で、profiles の有料ユーザー10行すべてで
-- updated_at = created_at になっている。plan を後から変えた行でも同じ値
-- なので、set_updated_at トリガーが profiles に効いていないと見られる
-- （schema.sql / social.sql が定義しているはずの関数）。
--
-- 結果として「この行がいつ有料になったか」を DB から知る方法が無く、
-- billing_source が NULL の行の由来を追えなかった。今回のスコープ外として
-- ここに記録しておく。調べるなら:
--
--   SELECT tgname, tgenabled FROM pg_trigger
--   WHERE  tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
--
--   SELECT proname FROM pg_proc WHERE proname = 'set_updated_at';
--
-- ⚠️ 直すときは profiles への UPDATE トリガー追加になる。plan 判定に
--    影響しないことを確認してから。過去にこのテーブル絡みで全員 Free
--    になった事故がある。
