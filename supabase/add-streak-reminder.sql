-- ============================================================
--  Nihongo Diary — 夜のストリーク通知：送信ログと対象者の絞り込み
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑦ の順に1文ずつ実行する。
--
--  ⚠️ ⑥（cron）は /api/notifications/streak-reminder がデプロイされてから
--     流すこと。先に流すと毎時 404 を叩き続ける（害はないが無意味）。
--     ①〜⑤ は先に流してよい（呼ばれるまで何も起きない）。
--
--  ── 何をする機能か ──────────────────────────────────────────
--  ストリークが続いているのに今日まだ書いていない学習者へ、その人の
--  ローカル20時に1通だけ送る。「🔥 3-day streak / 今日はまだ空です」。
--
--  朝の復習通知（add-daily-review-sender.sql）とは別物として作る。あちらは
--  「昨日の文をもう一度」、こちらは「今日まだ書いていない」。同じ人が両方を
--  受け取る日はあるが、それは朝に促されてなお夜まで書かなかった日だけで、
--  書いた人には夜は飛ばない。
--
--  ── 設計 ────────────────────────────────────────────────
--    - daily_review_candidates / daily_review_sends には一切触らない。
--      新しいテーブル1つと新しい関数1つを足すだけ。相乗りしないのは、
--      片方を止めたいときに片方だけ止められるようにするため。
--    - profiles には列を足さない。必要な3列はすでにある（③参照）。
--    - usage_limits / audio_usage / audio_usage_daily / shadowing_usage /
--      dictation_attempts / correction_count / translation_count /
--      recheck_count・try_use_* の各関数・normalizePlan・Stripe・streak 表示・
--      既存トリガーには触らない。
--    - diary_entries は読むだけ。
-- ============================================================


-- ============================================================
--  ① 送信ログ
-- ============================================================
-- 主キー (user_id, sent_date) が重複防止の実体。ルートは送信の「前」に
-- insert し、1行入ったときだけ送る。判定と記録が1文になるので、pg_net の
-- 再送やジョブの重なりで2本同時に走っても通るのは片方だけになる。
-- add-daily-review-sender.sql ① と同じ形・同じ理由。
--
-- ⚠️ daily_review_sends を流用しない。共有すると朝の1通が夜の1通を
--    抑止してしまい、役割の違う2つが1日1通を取り合うことになる。
--
-- streak_at_send は送った時点の連続日数。効果測定のためだけに持つ:
--   「通知を受けた人が、その日のうちに書いたか」
-- を diary_entries.created_at と突き合わせて言えるのは、この列と sent_at が
-- 残っている場合だけ。入れずに始めると、効いているかどうかを後から
-- 誰も答えられなくなる。
create table if not exists public.streak_reminder_sends (
  user_id        uuid not null references auth.users (id) on delete cascade,
  sent_date      date not null,
  sent_at        timestamptz not null default now(),
  streak_at_send integer,
  primary key (user_id, sent_date)
);


-- ============================================================
--  ② RLS を有効化（ポリシーは1本も作らない）
-- ============================================================
-- 読み書きするのは /api/notifications/streak-reminder だけで、そこでは
-- サービスロールを使う。サービスロールは RLS を通らないのでポリシーは
-- 要らず、クライアントからは存在しないテーブルとして振る舞う。
alter table public.streak_reminder_sends enable row level security;


-- ============================================================
--  ③ ⚠️ この機能が使う profiles の3列について
-- ============================================================
-- 列は追加しない。すでにあるものを配線する。
--
--   push_token          … 端末登録。PushRegistrar がブラウザでは早期 return
--                         するので、値があること自体が「iOS アプリの利用者」
--                         を意味する。
--
--   push_remind_hour    … 通知を出すローカル時刻。現在は全ユーザーが 20。
--                         ⑤ の関数はこの列を読む。20 を定数で埋め込まないのは、
--                         列がすでにあり、将来 UI から変えられるようにする
--                         ためだけの理由による。
--
--   push_notify_enabled … ⚠️ この列は「夜のリマインドを送ってよいか」を
--                         制御する。ここで初めて意味が与えられる。
--
--                         2026-08-03 時点で、この列はアプリのどこからも
--                         読まれていなかった（全ユーザー true のまま放置）。
--                         これ以降、false にすると夜のストリーク通知だけが
--                         止まる。朝の復習通知は daily_review_push が制御し、
--                         この列とは無関係のまま。2つを混ぜないこと。
--
--                         UI はまだ無い。付けるときは DailyReviewPushToggle と
--                         同じ形で profiles.push_notify_enabled を更新する。
--
-- 現在値の確認（読むだけ）:
--   SELECT count(*) FILTER (WHERE push_token IS NOT NULL)     AS with_token,
--          count(*) FILTER (WHERE push_notify_enabled)         AS notify_on,
--          count(DISTINCT push_remind_hour)                    AS distinct_hours
--   FROM   public.profiles;


-- ============================================================
--  ④ 古い行の掃除について
-- ============================================================
-- 自動削除は入れない。1日あたり10〜15行の増加で、放っておいて困る速度では
-- ない。増えてきたら手で流すか pg_cron に載せる:
--   delete from public.streak_reminder_sends where sent_date < current_date - 90;
-- ⚠️ 当日ぶんは絶対に消さないこと。消した相手にその日2通目が飛ぶ。


-- ============================================================
--  ⑤ 対象者の絞り込み
-- ============================================================
-- 返すのは「今このタイミングで、ローカル20時を迎えていて、昨日は書いたのに
-- 今日まだ書いていない学習者」。
--
-- ⚠️ 連続日数（N）はここでは数えない。返すのは直近100日ぶんの diary_date の
--    配列で、N はルート側が lib/streak.ts の currentStreak() で出す。SQL に
--    歩き方を書くと、アプリ内で5つ目のストリーク実装になる。今日、同じ walk が
--    4箇所にあり、そのうち1つ（週次レポート）だけ定義が違っていて、63人が
--    2つの異なる数字を見られる状態になっていることが分かったばかり。
--
-- ⚠️ pg_timezone_names とは INNER JOIN。タイムゾーンが NULL または不正な
--    学習者は対象から外す。UTC に落とすと「UTC 20時」に送ることになり、
--    それは日本の朝5時であり、米国東部の午後4時。夜に届かない通知は
--    リマインドではなく、ただの迷惑になる。深夜に起こされた人は通知そのものを
--    切るので、1通のために全部を失う。
--    （add-daily-review-hourly.sql で朝の関数に入れたのと同じ判断。）
--
-- 「昨日書いた」で streak >= 1 が保証される: currentStreak は今日が空なら
-- 昨日から数え始めるので、昨日があれば必ず1以上になる。だからここでは
-- 昨日の1件だけ確認すればよく、走査は要らない。
--
-- p_user_id を渡すと時刻の判定を飛ばす（任意の時間に手でテストするため）。
-- add-daily-review-sender.sql ④ と同じ約束。DEFAULT は付けない
-- （SQL Editor が受け付けないため）ので、呼び出し側は必ず2引数で呼ぶ。
--
-- ⚠️ 本体を1行にしてあるのは元ファイルと同じ理由。Supabase Dashboard の
--    SQL Editor に複数行の CREATE FUNCTION を貼ると文が壊れる。
create or replace function public.streak_reminder_candidates(
  p_user_id uuid
)
returns table (
  user_id            uuid,
  push_token         text,
  preferred_language text,
  local_date         date,
  written_dates      date[]
)
language sql
stable
security definer
set search_path = public
as $function$ with due as (select p.id as uid, p.push_token as tok, p.preferred_language as lang, (now() at time zone tzn.name) as local_now, p.push_remind_hour as hr from public.profiles p join pg_timezone_names tzn on tzn.name = p.timezone where p.push_token is not null and p.push_notify_enabled = true and (p_user_id is null or p.id = p_user_id)) select due.uid, due.tok, due.lang, due.local_now::date, array(select e.diary_date from public.diary_entries e where e.user_id = due.uid and e.diary_date > due.local_now::date - 100 order by e.diary_date desc) from due where (p_user_id is not null or extract(hour from due.local_now) = due.hr) and exists (select 1 from public.diary_entries y where y.user_id = due.uid and y.diary_date = due.local_now::date - 1) and not exists (select 1 from public.diary_entries d where d.user_id = due.uid and d.diary_date = due.local_now::date) and not exists (select 1 from public.streak_reminder_sends s where s.user_id = due.uid and s.sent_date = due.local_now::date) $function$;


-- ============================================================
--  ⑥ 実行権限
-- ============================================================
-- ⚠️ Postgres は関数の EXECUTE を既定で PUBLIC に与え、Supabase はさらに
--    anon / authenticated / service_role へ直接配る。`revoke ... from public`
--    だけでは剥がれないので名指しする。
--
-- 剥がさないと authenticated から呼べてしまい、他人の push_token が読める。
-- SECURITY DEFINER なので RLS も通らない = 全員分が返る。
-- daily_review_candidates と同じ理由・同じ手当て。
revoke all on function public.streak_reminder_candidates(uuid) from public, anon, authenticated;
grant execute on function public.streak_reminder_candidates(uuid) to service_role;


-- ============================================================
--  ⑦ 毎時のジョブ
-- ============================================================
-- ⚠️ ルートをデプロイしてから流すこと。
--
-- 最初から毎時。「まず1時間だけ」で様子を見ない。朝の通知がそれで
-- '0 23 * * *' のまま止まり、UTC+9 の学習者しか対象になれない状態が続いて
-- いたのを見つけたのが今日。対象は1日10〜15人なので、観察の価値より
-- 止まったまま忘れられる危険のほうが大きい。
--
-- 目視したいときは、cron ではなくルートの dryRun を叩く:
--   curl -X POST https://nihongodiary.app/api/notifications/streak-reminder \
--     -H "x-cron-secret: <CRON_SECRET>" -H "Content-Type: application/json" \
--     -d '{"dryRun":true,"onlyUserId":"<uuid>"}'
--   → 送らずに、誰が対象で連続何日かだけ返る。
--
-- ジョブ名は朝のものと別。同じ名前で呼び直すと上書きされる（pg_cron 1.4+）
-- ので、'daily-review-push' と取り違えないこと。取り違えると朝の通知が
-- 消える。
--
-- ⚠️ x-cron-secret は vault から読む。cron.job.command は平文で残るため、
--    ここに秘密を直接書かない。add-daily-review-cron.sql と同じ形で、同じ
--    シークレット（daily_review_secret）を使う。ルート側も同じ CRON_SECRET を
--    見る。
select cron.schedule(
  'streak-reminder-push',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://nihongodiary.app/api/notifications/streak-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'daily_review_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);


-- ============================================================
--  VERIFY — 適用直後（①〜⑥のあと、⑦の前でもよい）
-- ============================================================
--   SELECT count(*) AS columns FROM information_schema.columns
--   WHERE  table_schema = 'public' AND table_name = 'streak_reminder_sends';
--   -- 期待: 4（user_id, sent_date, sent_at, streak_at_send）
--
--   SELECT relrowsecurity FROM pg_class
--   WHERE  oid = 'public.streak_reminder_sends'::regclass;
--   -- 期待: true
--
--   SELECT count(*) FROM pg_policies WHERE tablename = 'streak_reminder_sends';
--   -- 期待: 0（ポリシーを作らないのが設計）
--
--   SELECT proname FROM pg_proc
--   WHERE  proname = 'streak_reminder_candidates' AND pronamespace = 'public'::regnamespace;
--   -- 期待: 1行
--
--   -- いま誰が対象か（送信はしない。時刻の条件が効くので、多くの場合0行が正常）
--   SELECT user_id, local_date, array_length(written_dates, 1) AS dates
--   FROM   public.streak_reminder_candidates(NULL);


-- ============================================================
--  VERIFY — ⑦のあと、最初の毎時0分
-- ============================================================
--   SELECT jobid, jobname, schedule, active FROM cron.job
--   WHERE  jobname IN ('streak-reminder-push', 'daily-review-push');
--   -- 期待: 2行。どちらも '0 * * * *' で active = true
--   -- ⚠️ 'daily-review-push' が消えていたら⑦でジョブ名を取り違えている
--
--   ★ 最重要
--   SELECT id, status_code, left(content, 200) AS body, created
--   FROM   net._http_response ORDER BY created DESC LIMIT 10;
--   -- 期待: status_code = 200
--   -- 403 → x-cron-secret 不一致 / 404 → ルート未デプロイ / 500 → CRON_SECRET 未設定
--
--   ⚠️ cron.job_run_details が succeeded でも、HTTP が 403 なら1通も送られない。
--      pg_net は投げっぱなしで、ジョブ側は POST を出したことしか知らない。


-- ============================================================
--  VERIFY — 翌日
-- ============================================================
--   SELECT sent_date, count(*) AS sent, min(sent_at), max(sent_at)
--   FROM   public.streak_reminder_sends GROUP BY 1 ORDER BY 1 DESC LIMIT 7;
--   -- 期待: 10〜15 件/日（2026-08-03 の本番データでの見積りは13人）
--
--   -- 効いているか: 通知を受けた人が、その日のうちに書いたか
--   SELECT s.sent_date,
--          count(*)                                   AS reminded,
--          count(d.id)                                AS wrote_after,
--          round(100.0 * count(d.id) / count(*), 1)   AS pct
--   FROM   public.streak_reminder_sends s
--   LEFT   JOIN public.diary_entries d
--          ON d.user_id = s.user_id AND d.diary_date = s.sent_date
--   GROUP  BY 1 ORDER BY 1 DESC LIMIT 14;
--   -- これが streak_at_send と sent_at を持っている理由。効果を語れる唯一の形。
--
--   -- 連続日数の分布（誰に効いているのか）
--   SELECT streak_at_send, count(*) FROM public.streak_reminder_sends
--   GROUP  BY 1 ORDER BY 1;
--
--   SELECT user_id, sent_date, count(*) FROM public.streak_reminder_sends
--   GROUP  BY 1,2 HAVING count(*) > 1;
--   -- 期待: 0行


-- ============================================================
--  ROLLBACK
-- ============================================================
--   -- 夜の通知だけを止める（朝はそのまま動く）
--   select cron.unschedule('streak-reminder-push');
--
--   -- 全部戻す
--   DROP FUNCTION IF EXISTS public.streak_reminder_candidates(uuid);
--   DROP TABLE    IF EXISTS public.streak_reminder_sends;   -- ポリシーも一緒に消える
--
--   ⚠️ daily_review_sends / daily_review_candidates / try_use_* /
--      profiles の列には影響しない。push_notify_enabled は値を書き換えて
--      いないので、戻しても全員 true のまま残る。


-- ============================================================
--  NOTE — 送らない相手
-- ============================================================
-- 意図的に対象から外れる人が3種類いる。いずれも仕様。
--
--   1. タイムゾーンが NULL または不正（⑤の inner join）
--      2026-08-03 時点で、端末登録済み116人のうち1人。TimezoneSyncer が
--      アプリを開くたびに profiles.timezone を書くので、次に開いた時点で
--      自動的に対象へ戻る。
--
--   2. 今日もう書いた人
--      通知の目的が達成されている。
--
--   3. 昨日書いていない人
--      守るストリークが無い。ここに送ると「戻っておいで」の通知になり、
--      それは別の機能（Obie の welcome back）の仕事。混ぜない。
--
--   4. ⚠️ push_remind_hour が NULL の人
--      extract(hour ...) = NULL は真にならないので、黙って対象から外れる。
--      2026-08-03 時点では全ユーザーが 20 なので該当0人だが、この列に
--      NULL を入れられるようにしたまま UI を付けると、「通知が来ない」と
--      いう報告の原因になり、しかもログには何も出ない。UI を付けるときは
--      NOT NULL 制約か既定値20を先に入れること。
--
-- 連続1日の学習者には送る。2026-08-03 の見積りでは対象13人のうち7人が
-- これに当たる。日記を1件書いて止まった学習者が174人いて、伸ばすべきは
-- 29→30 ではなく 1→2 だという判断。文言はルート側で分けてある。
