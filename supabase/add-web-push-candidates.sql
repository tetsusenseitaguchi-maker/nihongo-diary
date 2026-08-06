-- ============================================================
--  Nihongo Diary — Web Push 版の候補抽出（段階1-B / 1-C）
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (create or replace / idempotent).
--  ①〜⑥ の順に1文ずつ実行する。
--
--  ⚠️ このファイルの末尾に ROLLBACK の記載があるが、実行しないこと。
--     すべてコメントとして書いてある。元に戻したいときだけ使う。
--
--  ── なぜ既存の関数を直さず、複製するのか ────────────────────
--  daily_review_candidates / streak_reminder_candidates は
--  「変更禁止」の領域。あれは iOS に届いている現行の配信そのもので、
--  条件を1つ間違えると朝と夜の通知が全ユーザーぶん止まるか、二重に出る。
--
--  ── ⚠️ 対になっている。片方だけ直さないこと ────────────────
--  この2つの関数は、既存2つの「配信手段の判定だけを差し替えた複製」。
--  抽出条件（対象時刻・前日に書いた・今日はまだ・送信済みでない・
--  daily_review_push / push_notify_enabled の尊重）は一字一句同じにして
--  ある。ここがずれると「iOS の人には来るのに Web の人には来ない日が
--  ある」という、いちばん気づきにくい壊れ方をする。
--
--  差分は3点だけ:
--    ① p.push_token is not null  →  p.push_token is null
--    ② push_subscriptions に行があること（exists）を追加
--    ③ push_token 列を返さない（送信側が user_id から購読を引く）
--
--  比較しやすいように、既存2関数の現行定義をこのファイルの末尾に
--  コメントとして丸ごと貼ってある。条件を変えるときは、
--  必ず両方を同じ画面で見比べること。
--
--  ── 本体が1行なのは、読みにくさを承知のうえの意図 ──────────
--  複数行の CREATE FUNCTION は Supabase の SQL Editor に貼ると整形で
--  壊れて "syntax error at or near )" になる（既存2関数も同じ理由で
--  1行になっている）。整形して読みたいときは psql にこのファイルを
--  流すか、pg_get_functiondef() の出力を整形すること。
--
--  ── 二重配信について ────────────────────────────────────
--  同じ人が両方の候補に出ることは、① の否定同士（is null / is not null）
--  により論理的に起こらない。⑥ のクエリはそれを継続的に検査するためのもの。
--
--  仮に破れても、送信ルートは「送る前に daily_review_sends /
--  streak_reminder_sends へ予約する」形で、その主キーは
--  (user_id, sent_date) ——配信手段を含まない。2通目の予約は 23505 で
--  弾かれるので、DB が最後の砦として1日1通を保証する。
--
--  touches: 新しい関数2つだけ。
--    daily_review_candidates / streak_reminder_candidates /
--    profiles / push_token / push_notify_enabled / daily_review_push /
--    daily_review_sends / streak_reminder_sends / push_subscriptions /
--    既存トリガー / try_use_* — いずれも変更しない（読むだけ）。
-- ============================================================


-- ============================================================
--  ① 朝の復習：Web Push 版の候補
-- ============================================================
-- 既存 daily_review_candidates との差分は上記①②③のみ。
create or replace function public.daily_review_candidates_web(
  p_hour     integer,
  p_user_id  uuid
)
returns table (
  user_id            uuid,
  preferred_language text,
  diary_entry_id     uuid,
  natural_japanese   text,
  local_date         date
)
language sql
stable
security definer
set search_path = public
as $function$ with due as (select p.id as uid, p.preferred_language as lang, (now() at time zone tzn.name) as local_now from public.profiles p join pg_timezone_names tzn on tzn.name = p.timezone where p.daily_review_push = true and p.push_token is null and exists (select 1 from public.push_subscriptions sub where sub.user_id = p.id) and (p_user_id is null or p.id = p_user_id)) select distinct on (due.uid) due.uid, due.lang, e.id, e.natural_japanese, due.local_now::date from due join public.diary_entries e on e.user_id = due.uid and e.diary_date = (due.local_now::date - 1) and e.natural_japanese is not null and e.natural_japanese <> '' where (p_user_id is not null or extract(hour from due.local_now) = p_hour) and not exists (select 1 from public.dictation_attempts a where a.user_id = due.uid and a.diary_entry_id = e.id and a.usage_date = due.local_now::date) and not exists (select 1 from public.daily_review_sends s where s.user_id = due.uid and s.sent_date = due.local_now::date) order by due.uid, e.created_at desc $function$;


-- ============================================================
--  ② ①の権限
-- ============================================================
-- security definer なので、剥がさないと authenticated から呼べてしまい、
-- 他人の日記本文と user_id が読める。既存2関数と同じ扱いにする。
revoke all on function public.daily_review_candidates_web(integer, uuid) from public, anon, authenticated;

grant execute on function public.daily_review_candidates_web(integer, uuid) to service_role;


-- ============================================================
--  ③ 夜のストリーク：Web Push 版の候補
-- ============================================================
-- 既存 streak_reminder_candidates との差分は上記①②③のみ。
-- push_notify_enabled = true はそのまま尊重する（夜の通知だけを止める
-- スイッチで、iOS と Web で意味が変わってはいけない）。
create or replace function public.streak_reminder_candidates_web(
  p_user_id  uuid
)
returns table (
  user_id            uuid,
  preferred_language text,
  local_date         date,
  written_dates      date[]
)
language sql
stable
security definer
set search_path = public
as $function$ with due as (select p.id as uid, p.preferred_language as lang, (now() at time zone tzn.name) as local_now, p.push_remind_hour as hr from public.profiles p join pg_timezone_names tzn on tzn.name = p.timezone where p.push_token is null and p.push_notify_enabled = true and exists (select 1 from public.push_subscriptions sub where sub.user_id = p.id) and (p_user_id is null or p.id = p_user_id)) select due.uid, due.lang, due.local_now::date, array(select e.diary_date from public.diary_entries e where e.user_id = due.uid and e.diary_date > due.local_now::date - 100 order by e.diary_date desc) from due where (p_user_id is not null or extract(hour from due.local_now) = due.hr) and exists (select 1 from public.diary_entries y where y.user_id = due.uid and y.diary_date = due.local_now::date - 1) and not exists (select 1 from public.diary_entries d where d.user_id = due.uid and d.diary_date = due.local_now::date) and not exists (select 1 from public.streak_reminder_sends s where s.user_id = due.uid and s.sent_date = due.local_now::date) $function$;


-- ============================================================
--  ④ ③の権限
-- ============================================================
revoke all on function public.streak_reminder_candidates_web(uuid) from public, anon, authenticated;

grant execute on function public.streak_reminder_candidates_web(uuid) to service_role;


-- ============================================================
--  ⑤ 作成できたかの確認（読むだけ。実行して差し支えない）
-- ============================================================
--   -- 関数が4つ並ぶ（既存2 + 新規2）。_web が隣にあることを目で確認する
--   SELECT p.proname, pg_get_function_arguments(p.oid) AS args
--   FROM   pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE  n.nspname = 'public'
--     AND  p.proname IN ('daily_review_candidates', 'daily_review_candidates_web',
--                        'streak_reminder_candidates', 'streak_reminder_candidates_web')
--   ORDER  BY p.proname;
--
--   -- 権限が service_role だけになっているか（anon / authenticated が出たら失敗）
--   SELECT p.proname, p.proacl
--   FROM   pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE  n.nspname = 'public' AND p.proname LIKE '%_candidates_web';
--
--   -- 空で返ることの確認（購読者がまだ0なら 0 行が正しい）
--   SELECT count(*) FROM public.daily_review_candidates_web(8, null);
--   SELECT count(*) FROM public.streak_reminder_candidates_web(null);


-- ============================================================
--  ⑥ ⚠️ ずれ検出 — 「いつ実行するか」
-- ============================================================
--  【必ず実行するとき】
--    ・このファイルの①または③を編集したとき
--    ・add-daily-review-hourly.sql / add-streak-reminder.sql の
--      候補抽出条件を編集したとき
--    ・朝夜の通知の対象者・時刻・条件を変えたとき
--
--  overlap が 1 以上なら、同じ人が両方の候補に出ている＝二重配信の
--  一歩手前。ただちに①③の push_token 条件を確認すること。
--
--  【毎回の自動チェック】
--    このクエリを人が思い出す必要がないよう、送信ルート
--    （api/notifications/daily-review, streak-reminder）が毎時の実行で
--    同じ判定をコード側で行い、重なりを見つけたら console.error を出す。
--    このクエリは、その仕組みが動く前と、SQL を直した直後に手で確認する
--    ためのもの。
--
--   -- 朝（現在時刻のコホートで確認）
--   SELECT
--     (SELECT count(*) FROM public.daily_review_candidates(extract(hour from now())::int, null))     AS apns_cohort,
--     (SELECT count(*) FROM public.daily_review_candidates_web(extract(hour from now())::int, null)) AS web_cohort,
--     (SELECT count(*) FROM (
--        SELECT user_id FROM public.daily_review_candidates_web(extract(hour from now())::int, null)
--        INTERSECT
--        SELECT user_id FROM public.daily_review_candidates(extract(hour from now())::int, null)
--      ) x) AS overlap;   -- ★ 0 以外なら異常
--
--   -- 夜
--   SELECT
--     (SELECT count(*) FROM public.streak_reminder_candidates(null))     AS apns_cohort,
--     (SELECT count(*) FROM public.streak_reminder_candidates_web(null)) AS web_cohort,
--     (SELECT count(*) FROM (
--        SELECT user_id FROM public.streak_reminder_candidates_web(null)
--        INTERSECT
--        SELECT user_id FROM public.streak_reminder_candidates(null)
--      ) x) AS overlap;   -- ★ 0 以外なら異常


-- ============================================================
--  ⑦ 実行時間の見張り（maxDuration = 60 秒の余裕を測る）
-- ============================================================
--  1回の実行にかかる時間はおおよそ
--     (対象人数 ÷ 8並列) × (予約1往復 + 送信1往復)
--  で、送信込み1人あたり約 0.3 秒、実効 約 37ms/人。
--  500人で約19秒、iOS と Web の両方が満杯（各500人）で約38秒。
--
--  ⚠️ 見直しの目安（1時間コホートの合計人数）
--     〜500人    余裕あり（約19秒）
--     700人      要監視（約26秒）
--     1,000人超  maxDuration を上げるか、Web 側の MAX_PER_RUN を絞る
--
--  MAX_PER_RUN = 500 に達すると静かに切り捨てられる（ログには出る）。
--  時間帯は日本と北米に偏るので、購読者総数 1,500〜2,000 で
--  最大コホートが 500 に届き得る。総数がそこに近づいたら下を実行する。
--
--   -- 時間帯ごとの Web Push 購読者数（最大コホートを見る）
--   SELECT extract(hour from (now() at time zone tzn.name))::int AS local_hour,
--          count(DISTINCT p.id) AS web_subscribers
--   FROM   public.profiles p
--   JOIN   pg_timezone_names tzn ON tzn.name = p.timezone
--   JOIN   (SELECT DISTINCT user_id FROM public.push_subscriptions) s ON s.user_id = p.id
--   WHERE  p.push_token IS NULL
--   GROUP  BY 1 ORDER BY 2 DESC LIMIT 5;


-- ============================================================
--  参考：既存2関数の現行定義（2026-08-06 時点）
--  ⚠️ ここは実行しない。①③と見比べるためだけに貼ってある。
-- ============================================================
--  daily_review_candidates(p_hour integer, p_user_id uuid)
--    returns (user_id, push_token, preferred_language, diary_entry_id,
--             natural_japanese, local_date)
--    body:
--      with due as (select p.id as uid, p.push_token as tok,
--        p.preferred_language as lang, (now() at time zone tzn.name) as local_now
--        from public.profiles p join pg_timezone_names tzn on tzn.name = p.timezone
--        where p.daily_review_push = true and p.push_token is not null
--          and (p_user_id is null or p.id = p_user_id))
--      select distinct on (due.uid) due.uid, due.tok, due.lang, e.id,
--        e.natural_japanese, due.local_now::date
--      from due join public.diary_entries e on e.user_id = due.uid
--        and e.diary_date = (due.local_now::date - 1)
--        and e.natural_japanese is not null and e.natural_japanese <> ''
--      where (p_user_id is not null or extract(hour from due.local_now) = p_hour)
--        and not exists (select 1 from public.dictation_attempts a
--              where a.user_id = due.uid and a.diary_entry_id = e.id
--                and a.usage_date = due.local_now::date)
--        and not exists (select 1 from public.daily_review_sends s
--              where s.user_id = due.uid and s.sent_date = due.local_now::date)
--      order by due.uid, e.created_at desc
--
--  streak_reminder_candidates(p_user_id uuid)
--    returns (user_id, push_token, preferred_language, local_date, written_dates)
--    body:
--      with due as (select p.id as uid, p.push_token as tok,
--        p.preferred_language as lang, (now() at time zone tzn.name) as local_now,
--        p.push_remind_hour as hr
--        from public.profiles p join pg_timezone_names tzn on tzn.name = p.timezone
--        where p.push_token is not null and p.push_notify_enabled = true
--          and (p_user_id is null or p.id = p_user_id))
--      select due.uid, due.tok, due.lang, due.local_now::date,
--        array(select e.diary_date from public.diary_entries e
--              where e.user_id = due.uid and e.diary_date > due.local_now::date - 100
--              order by e.diary_date desc)
--      from due
--      where (p_user_id is not null or extract(hour from due.local_now) = due.hr)
--        and exists (select 1 from public.diary_entries y
--              where y.user_id = due.uid and y.diary_date = due.local_now::date - 1)
--        and not exists (select 1 from public.diary_entries d
--              where d.user_id = due.uid and d.diary_date = due.local_now::date)
--        and not exists (select 1 from public.streak_reminder_sends s
--              where s.user_id = due.uid and s.sent_date = due.local_now::date)


-- ============================================================
--  ROLLBACK — 実行しないこと。元に戻したいときだけ使う
-- ============================================================
--   DROP FUNCTION IF EXISTS public.daily_review_candidates_web(integer, uuid);
--   DROP FUNCTION IF EXISTS public.streak_reminder_candidates_web(uuid);
--
--  既存2関数には何もしていないので、これで完全に元の状態に戻る。
--  （ルート側のコードが先にデプロイされていても、RPC が無いときは
--    エラーがログに出るだけで、APNs の配信は影響を受けない。）
-- ============================================================
