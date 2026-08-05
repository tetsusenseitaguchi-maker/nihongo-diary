-- ============================================================
--  Nihongo Diary — Web Push の購読の置き場所（段階0：受け皿のみ）
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑥ の順に1文ずつ実行する。
--
--  ⚠️ このファイルの末尾に ROLLBACK の記載があるが、実行しないこと。
--     すべてコメントとして書いてある。元に戻したいときだけ使う。
--
--  ── 何のためのテーブルか ────────────────────────────────────
--  ブラウザの Web Push の購読を保存する。iOS アプリ（APNs）とは
--  完全に別系統で、既存の profiles.push_token には一切触らない。
--
--  段階0 の範囲は「購読を受け取って保存する」ところまで。既存の4つの
--  通知経路（api/push/send, daily-review, streak-reminder,
--  notifications/obie）からの送信は段階1で、このファイルとは別に扱う。
--
--  ── なぜ profiles に列を足さないのか ────────────────────────
--  ① 構造が違う。push_token は文字列1本だが、Web Push の購読は
--     endpoint / p256dh / auth の3点セットで意味を成す。
--
--  ② 個数が違う。push_token は1ユーザー1本（register が UPDATE で
--     上書きする）。Web Push は「PC の Chrome」と「iPad の Safari」を
--     同時に持てるので、1ユーザー N 行になる。profiles の列では表せない。
--
--  ③ plan と同居させない。profiles を読むクエリに列を足すと、列が無い
--     環境でその行ごとクエリが落ちて normalizePlan(undefined) が全員を
--     Free と判定する。timezone 列で実際に起きた事故と同じ形で、
--     vocab_review_settings / discovery_settings がテーブルを分けている
--     のと同じ理由。SQL 未実行のままコードが出ても、この1クエリだけが
--     失敗して「Web Push が使えない」で済む。
--
--  ── 関数は作らない ──────────────────────────────────────
--  ここは日次クォータではなく購読の保管なので、try_use_* のような
--  security definer 関数は要らない。このファイルは関数を1つも作らない
--  ので、「引数に default null を置かない」という既存の約束事に触れる
--  箇所もない。
--
--  touches: 新しいテーブルだけ。
--    profiles / plan / push_token / push_notify_enabled /
--    daily_review_push / push_remind_hour / usage_limits /
--    normalizePlan / try_use_correction / try_use_translation /
--    correction_count / translation_count / billing_source /
--    notifications / 既存のトリガー / 既存の RPC
--    — いずれにも一切触れない。
-- ============================================================


-- ============================================================
--  ① テーブル
-- ============================================================
-- 各列の意味:
--   endpoint    … プッシュサービス（Apple/Google/Mozilla）が発行する URL。
--                 購読の識別子そのもの。unique はここに付ける。同じ
--                 ブラウザが再購読すると同じ endpoint が返ることがあり、
--                 二重行を作らないための制約でもある。
--                 ⚠️ 秘密ではないが、これを知っている者はその端末に通知を
--                 送れる。RLS を外さないこと。
--   p256dh      … 購読者の公開鍵（Base64URL）。本文の暗号化に使う。
--   auth        … 認証シークレット（Base64URL）。同上。
--                 この2つが揃わないと web-push は送信できない。
--   user_agent  … どの端末・ブラウザの購読かを人間が読むためだけの列。
--                 配信の判断には使わない。null 可。
--   last_used_at… 最後に送信を試みた時刻。まだ一度も送っていない購読は
--                 null。「作られたが一度も使われていない」を default now()
--                 で塗り潰さないため、あえて nullable にしてある。
--                 更新するのは送信側（service role）だけ。
--
-- 主キーは id（サロゲート）。(user_id, endpoint) ではなく endpoint 単独に
-- unique を置くのは、購読が「どのユーザーのものか」より先に「どの端末か」
-- で一意だから — 同じブラウザで別アカウントにログインし直したとき、行が
-- 2本できるとその端末に二重で届く。
create table if not exists public.push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  endpoint     text        not null unique,
  p256dh       text        not null,
  auth         text        not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);


-- ============================================================
--  ② RLS 有効化
-- ============================================================
alter table public.push_subscriptions enable row level security;


-- ============================================================
--  ③ ポリシー削除（③④はセットで実行する）
-- ============================================================
-- 先に消してから作る。permissive なポリシーは OR で足し合わされるので、
-- 名前違いのものを二重に作ると権限が広がりうる。
drop policy if exists "Read own push subscriptions"   on public.push_subscriptions;
drop policy if exists "Insert own push subscriptions" on public.push_subscriptions;
drop policy if exists "Delete own push subscriptions" on public.push_subscriptions;


-- ============================================================
--  ④ ポリシー作成
-- ============================================================
-- select / insert / delete の3本。update は意図的に無い。
--
-- 購読は書き換えるものではなく、取り直すもの。ブラウザが新しい購読を
-- 発行したら、古い行を消して新しい行を入れる。update を許さないことで、
-- 他人の endpoint を自分の行に書き写すような操作が最初から成立しない。
--
-- ⚠️ この結果、クライアント側の insert ... on conflict do update
--    （upsert）は使えない。ON CONFLICT の update 経路が RLS の update
--    権限を要求するため。登録処理は「delete してから insert」で書く。
--
-- last_used_at を更新するのは送信側で、そこは service role（RLS を
-- 迂回する）なので、このポリシーの不在は送信の妨げにならない。
create policy "Read own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);


-- ============================================================
--  ⑤ インデックス
-- ============================================================
-- 読み方は1通りしかない ——「このユーザーの購読を全部」。
-- endpoint 側の索引は ① の unique 制約が自動で作るので、ここでは作らない。
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);


-- ============================================================
--  ⑥ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
-- これを忘れると、アプリからは「テーブルが無い」ように見える。
notify pgrst, 'reload schema';


-- ============================================================
--  確認（読むだけ。実行して差し支えない）
-- ============================================================
--   -- 列がそろっているか（期待: 8列）
--   SELECT column_name, data_type, is_nullable
--   FROM   information_schema.columns
--   WHERE  table_schema = 'public' AND table_name = 'push_subscriptions'
--   ORDER  BY ordinal_position;
--
--   -- ポリシーが3本か（期待: SELECT / INSERT / DELETE の3行。UPDATE は無い）
--   SELECT policyname, cmd FROM pg_policies
--   WHERE  schemaname = 'public' AND tablename = 'push_subscriptions';
--
--   -- RLS が有効か（期待: t）
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'push_subscriptions';
--
--   -- 購読の数（段階0の直後は 0 行）
--   SELECT count(*) AS subs, count(distinct user_id) AS users
--   FROM   public.push_subscriptions;
--
--   -- APNs 側と比べる。両方を持つ人がいるかどうかがここで分かる
--   -- （iOS アプリ内では購読できないので、いるとすれば別端末の人）
--   SELECT count(*) FILTER (WHERE p.push_token IS NOT NULL)                  AS apns_only_or_both,
--          count(*) FILTER (WHERE s.user_id IS NOT NULL)                     AS web_push,
--          count(*) FILTER (WHERE p.push_token IS NOT NULL
--                             AND s.user_id IS NOT NULL)                     AS both
--   FROM   public.profiles p
--   LEFT   JOIN (SELECT DISTINCT user_id FROM public.push_subscriptions) s
--          ON s.user_id = p.id;


-- ============================================================
--  ROLLBACK — 実行しないこと。元に戻したいときだけ使う
-- ============================================================
--   DROP TABLE IF EXISTS public.push_subscriptions;   -- ポリシーと索引も一緒に消える
--   NOTIFY pgrst, 'reload schema';
--
-- profiles には何も足していないので、戻すのはこの1文だけで済む。
-- ============================================================
