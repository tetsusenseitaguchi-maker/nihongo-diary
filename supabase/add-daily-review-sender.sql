-- ============================================================
--  Nihongo Diary — 翌朝の復習通知：送信ログと対象者の絞り込み
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑦ の順に1文ずつ実行する。
--
--  このファイルは「誰に送るべきか」と「もう送ったか」だけを扱う。
--  定時実行の登録は add-daily-review-cron.sql の担当で、あちらは
--  /api/notifications/daily-review がデプロイされてから流す。
--  こちらは先に流してよい（アプリから呼ばれるまで何も起きない）。
--
--  設計:
--    - 新規テーブル1つ + 新規関数1つ。既存には何も足さない。
--    - profiles の既存 SELECT には触らない。④の関数は独立したクエリで、
--      どのクエリにも列を足していない。
--    - 既存の通知経路（/api/push/send、Obie、NotificationBell、
--      notifications テーブル、apns.ts）には一切触らない。
--      重複防止に notifications を使わない理由は末尾の NOTE を参照。
--    - usage_limits / audio_usage / audio_usage_daily / shadowing_usage /
--      dictation_attempts / correction_count / translation_count /
--      recheck_count・try_use_* の各関数・normalizePlan・Stripe・streak・
--      既存トリガーには触らない。
--    - dictation_attempts は読むだけ（「今日もう書き取ったか」の判定）。
-- ============================================================


-- ============================================================
--  ① 送信ログ
-- ============================================================
-- 主キー (user_id, sent_date) が重複防止の実体。
-- ルートは送信の「前」に insert し、1行入ったときだけ送る。
-- 判定と記録が1文になるので、pg_net の再送やジョブの重なりで2本同時に
-- 走っても、通るのは片方だけになる。
--
-- ⚠️ Obie 形（notifications を count してから insert）を採らなかった理由が
--    ここにある。あちらは数えてから書くまでに隙間があり、その隙間に
--    もう1本入れる。詳しくは末尾の NOTE。
--
-- sent_date は学習者のローカル日付。UTC ではない（④が算出する）。
-- sent_at は「実際に何時に送ったか」の調査用で、判定には使わない。
create table if not exists public.daily_review_sends (
  user_id   uuid not null references auth.users (id) on delete cascade,
  sent_date date not null,
  sent_at   timestamptz not null default now(),
  primary key (user_id, sent_date)
);


-- ============================================================
--  ② RLS を有効化（ポリシーは1本も作らない）
-- ============================================================
-- 有効化した時点で、ポリシーの無い操作は全て拒否される。ここでは
-- select も insert も update も delete も、ポリシーを作らない。
--
-- これは手抜きではなく設計。このテーブルを読み書きするのは
-- /api/notifications/daily-review だけで、そこではサービスロールを使う。
-- サービスロールは RLS を通らないので、ポリシーが無くても動く。
-- 逆にクライアントからは
--   supabase.from("daily_review_sends").select()
-- を叩いても1行も返らず、insert も通らない。
-- add-tts-buckets.sql と同じ考え方で、「ポリシーを作らないこと」が防御。
--
-- ⚠️ 学習者に「いつ通知が送られたか」を見せる必要が出たときも、
--    select ポリシーを足す前に一度立ち止まること。送信ログは
--    プロダクト機能ではなく運用の記録で、UI に出す価値は薄い。
alter table public.daily_review_sends enable row level security;


-- ============================================================
--  ③ 送信ログの掃除用インデックス（任意だが安い）
-- ============================================================
-- 主キーの先頭列が user_id なので、「古い行をまとめて消す」形の
--   delete from daily_review_sends where sent_date < current_date - 90
-- は主キーでは引けない。運用で消すつもりがあるなら足しておく。
create index if not exists daily_review_sends_date_idx
  on public.daily_review_sends (sent_date);


-- ============================================================
--  ④ 対象者の絞り込み
-- ============================================================
-- SQL に任せるのは「タイムゾーンの計算」と「行の突き合わせ」だけ。
-- 採点可能かどうか（hasDictation）は TS 側で判定する。あれは
-- parseRubySegments を通す必要があり SQL では書けない。無理に書くと
-- 「採点できる文」の定義が TS と SQL に2つでき、必ずずれる。
--
-- 返す1行の意味: 「この学習者に、この日記の文で、今おしらせしてよい」。
--
-- 条件:
--   ・通知をオフにしていない        daily_review_push = true
--   ・端末が登録されている          push_token is not null
--   ・ローカル時刻が p_hour 時台
--   ・ローカルの昨日に日記があり、自然な日本語が入っている
--   ・その日記を今日まだ書き取っていない
--   ・今日まだ送っていない
--
-- ⚠️ p_user_id に既定値は付けない。Supabase Dashboard の SQL Editor は
--    引数リストの DEFAULT を受け付けず、"syntax error at or near )" で
--    落ちる（2026-08 に確認）。付け直さないこと。
--    その代わり呼び出し側は必ず2つとも渡す:
--      daily_review_candidates(8, null)          -- 通常の毎時実行
--      daily_review_candidates(8, '<user_id>')   -- 1人だけのテスト
--
-- ⚠️ p_user_id を渡すと、時刻の条件だけを外して1人に絞る。テスト用。
--    朝8時を待たずに自分の分だけ確認できるようにするためで、対象が
--    1人に限定されるので誤爆にはならない。
--
-- ⚠️ pg_timezone_names との LEFT JOIN は飾りではない。profiles.timezone は
--    自由文字列で、不正な値が1件でもあると
--      now() at time zone p.timezone
--    が例外を投げ、クエリ全体が落ちる = その時間帯の全員に届かなくなる。
--    JOIN にしておけば、不正な値と NULL はどちらも UTC に落ちるだけで済む。
--    （タイムゾーン絡みで全員が巻き添えになる事故は、このアプリでは
--      一度起きている。）
--
-- 規模について: pg_timezone_names は約1,200行のビューで、profiles の
-- 行数が数万に届くまでは毎時1回の結合として十分に安い。そこを越えたら
-- 有効なタイムゾーン名を実テーブルに落として結合すること。
create or replace function public.daily_review_candidates(
  p_hour    integer,
  p_user_id uuid
)
returns table (
  user_id            uuid,
  push_token         text,
  preferred_language text,
  diary_entry_id     uuid,
  natural_japanese   text,
  local_date         date
)
language sql
stable
security definer
set search_path = public
-- ⚠️ 本体を1行にしてある。読みにくいのは承知のうえで、意図的。
--    Supabase Dashboard の SQL Editor に複数行の CREATE FUNCTION を貼ると、
--    整形と行数制限の付与で文が壊れ "syntax error at or near )" になる
--    現象に当たった。1行なら行に依存する壊れ方をしない。
--    整形して読みたいときは、このファイルを psql に流すこと:
--      psql "$DATABASE_URL" -f supabase/add-daily-review-sender.sql
--
-- 本体がやっていること（上から順に）:
--   due  … 通知オン・端末登録済みの学習者に、そのローカル時刻を付ける。
--          不正なタイムゾーンと NULL はどちらも UTC に落ちる。
--   join … ローカルの昨日に書かれ、自然な日本語が入っている日記。
--   distinct on (due.uid) + order by created_at desc
--        … 1人1件。昨日の最後の1本を採る（ダッシュボードのカードと
--          同じ選び方なので、通知から着地したとき同じ日記が出る）。
--   not exists ×2 … 今日もう書き取った人／今日もう送った人を落とす。
as $function$ with due as (select p.id as uid, p.push_token as tok, p.preferred_language as lang, (now() at time zone coalesce(tzn.name,'UTC')) as local_now from public.profiles p left join pg_timezone_names tzn on tzn.name = p.timezone where p.daily_review_push = true and p.push_token is not null and (p_user_id is null or p.id = p_user_id)) select distinct on (due.uid) due.uid, due.tok, due.lang, e.id, e.natural_japanese, due.local_now::date from due join public.diary_entries e on e.user_id = due.uid and e.diary_date = (due.local_now::date - 1) and e.natural_japanese is not null and e.natural_japanese <> '' where (p_user_id is not null or extract(hour from due.local_now) = p_hour) and not exists (select 1 from public.dictation_attempts a where a.user_id = due.uid and a.diary_entry_id = e.id and a.usage_date = due.local_now::date) and not exists (select 1 from public.daily_review_sends s where s.user_id = due.uid and s.sent_date = due.local_now::date) order by due.uid, e.created_at desc $function$;


-- ============================================================
--  ⑤ 実行権限を PUBLIC から剥がす
-- ============================================================
-- ⚠️ Postgres は関数の EXECUTE を既定で PUBLIC に与える。剥がさないと
--    authenticated から呼べてしまい、他人の push_token が読める。
--    SECURITY DEFINER なので RLS も通らない = 全員分が返る。
--    record_dictation_attempt と同じ理由・同じ手当て。
revoke all on function public.daily_review_candidates(integer, uuid) from public;


-- ============================================================
--  ⑥ サービスロールにだけ与える
-- ============================================================
-- 呼ぶのは /api/notifications/daily-review だけ。
grant execute on function public.daily_review_candidates(integer, uuid) to service_role;


-- ============================================================
--  ⑦ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑦ を流したあとに実行）
-- ============================================================
-- (1) 送信ログの構造と主キー
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='daily_review_sends'
--   ORDER BY ordinal_position;
--   期待: user_id(uuid,NO) / sent_date(date,NO) / sent_at(timestamptz,NO)
--
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid='public.daily_review_sends'::regclass;
--   期待: PRIMARY KEY (user_id, sent_date) と auth.users への FOREIGN KEY
--   ⚠️ 主キーが user_id だけだと1人1回しか送れなくなる。
--
-- (2) RLS が有効で、ポリシーが1本も無いこと
--   SELECT relrowsecurity FROM pg_class
--   WHERE oid='public.daily_review_sends'::regclass;              -- 期待: true
--   SELECT count(*) FROM pg_policies
--   WHERE schemaname='public' AND tablename='daily_review_sends'; -- 期待: 0
--
-- (3) ★重要★ 関数を authenticated が呼べないこと
--   SELECT p.proname, p.prosecdef,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can,
--          has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_can
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND p.proname='daily_review_candidates';
--   期待: prosecdef=true / authenticated_can=FALSE / service_can=true
--   ⚠️ authenticated_can が true のまま出すと、誰でも全員分の
--      push_token を取得できる。ここが false でなければ先に進まないこと。
--
-- (4) 関数が動くこと（0行でも成功なら正しい）
--   SELECT count(*) FROM public.daily_review_candidates(8, null);
--   期待: エラーが出ないこと。件数は0でよい
--         （今この瞬間ローカル8時台で、昨日書いていて、まだ書き取って
--           いない人がいなければ0）。
--   ⚠️ ここで invalid time zone のエラーが出るなら、④の LEFT JOIN が
--      効いていない。関数を作り直すこと。
--
-- (5) 自分の分だけ見る（時刻の条件を外して確認できる）
--   SELECT * FROM public.daily_review_candidates(8, '<自分のuser_id>');
--   昨日日記を書いていれば1行返る。返らない場合の切り分けは:
--     SELECT daily_review_push, push_token IS NOT NULL AS has_token, timezone
--     FROM public.profiles WHERE id = '<自分のuser_id>';
--
-- (6) タイムゾーン未設定の人数（UTC 8時に届く人の数）
--   SELECT coalesce(nullif(timezone,''),'(null)') AS tz, count(*)
--   FROM public.profiles WHERE push_token IS NOT NULL
--   GROUP BY 1 ORDER BY 2 DESC;
--
-- (7) 既存が無傷であること
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname LIKE 'try_use_%' ORDER BY proname;
--   期待: try_use_audio, try_use_audio_daily, try_use_correction,
--         try_use_recheck, try_use_shadowing, try_use_translation
--
--   SELECT count(*) FROM public.notifications;
--   期待: 実行前と同じ件数。このファイルは notifications に触れていない。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- 関数だけ落とす（送信ログは残る＝再送も止まる）:
--   DROP FUNCTION IF EXISTS public.daily_review_candidates(integer, uuid);
--   NOTIFY pgrst, 'reload schema';
--
-- 完全に元に戻す:
--   DROP TABLE IF EXISTS public.daily_review_sends;
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ 送信ログを消すと「今日もう送ったか」が分からなくなる。cron が
--    生きたまま消すと、その日の対象者にもう一度届く。先に
--    add-daily-review-cron.sql の unschedule を実行すること。
--
-- ⚠️ ロールバックしても profiles / notifications / dictation_attempts /
--    既存6関数には影響しない（このファイルは書き込んでいない）。


-- ============================================================
--  NOTE — 重複防止に notifications を使わない理由
-- ============================================================
-- Obie は「同じ type の行が直近18時間に無いか count する → 無ければ
-- insert して送る」形をとっている（api/notifications/obie/route.ts:53-74）。
-- 同じ形にしなかった理由が2つある。
--
-- 1) 数えてから書くまでに隙間がある。アプリを開くたびに走る Obie では
--    実害が小さいが、こちらは pg_net が再送したりジョブが重なったりする
--    経路なので、同じ隙間が二重送信になる。①の主キーなら、同時に来た
--    2本のうち通るのは必ず1本だけ。
--
-- 2) NotificationBell が未知の type を空行として描く
--    （notifText の default が "" を返す。NotificationBell.tsx:123）。
--    重複防止のためだけに notifications へ行を入れると、ベルに文言の無い
--    行が並ぶ。直すには NotificationBell に case を足すことになり、
--    それは既存の通知 UI に手を入れる話になる。
--
-- 在庫としてベルにも出したくなった場合は、このテーブルはそのままに、
-- notifications への insert を「追加で」行うこと。重複防止の責務を
-- notifications に戻さないこと。
-- ============================================================
