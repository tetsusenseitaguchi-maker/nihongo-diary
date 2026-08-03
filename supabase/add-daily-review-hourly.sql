-- ============================================================
--  Nihongo Diary — 翌朝の復習通知：毎時化と、タイムゾーン不明者の除外
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜④ の順に1文ずつ実行する。
--
--  適用: 2026-08-03（ダッシュボードで手動実行）
--
--  add-daily-review-sender.sql と add-daily-review-cron.sql の続き。
--  あちらの ④ が「まずは1時間だけ」で登録した cron を、予告どおり毎時に
--  広げる。あわせて daily_review_candidates を1箇所だけ差し替える。
--
--  ── なぜ広げるのか ──────────────────────────────────────────
--  cron が '0 23 * * *'（UTC 23時＝JST 朝8時）の1日1回だったため、
--  対象になりうるのは UTC+9 の学習者だけだった。実測:
--
--    push 登録かつ通知オン          115 人
--    → そのうち現地が8時ちょうど      9 人   ← ここで 106 人が落ちる
--    → 現地の昨日に添削済み日記あり    2 人
--    → 今日まだ書き取っていない        1 人
--    → 実際に届いた                    1 人
--
--  端末を登録している115人は44のタイムゾーンに散っており、最大の層は
--  America/New_York の21人（現地8時 = UTC 12時）。そこには1通も届いて
--  いなかった。毎時に広げると同じ日のデータで 1人 → 14人 になる。
--
--  1回あたりの最大は6人で、ルートの MAX_PER_RUN = 500 には遠い。
--  重複は daily_review_sends の主キー (user_id, sent_date) が止めるので、
--  実行回数を24倍にしても1人1日1通は変わらない。
--
--  ── 設計 ────────────────────────────────────────────────
--    - 新しいテーブルも列も作らない。既存関数の差し替えと、既存 cron
--      ジョブの上書きだけ。
--    - usage_limits / audio_usage / audio_usage_daily / shadowing_usage /
--      dictation_attempts / correction_count / translation_count /
--      recheck_count・try_use_* の各関数・normalizePlan・Stripe・streak・
--      既存トリガーには触らない。
--    - daily_review_sends の行は消さない。過去の送信記録はそのまま。
--    - アプリのコードは変更なし。/api/notifications/daily-review は
--      p_hour = 8 を渡すだけで、呼ばれる回数が増えることを知らない。
-- ============================================================


-- ============================================================
--  ① 実行前に控える（ロールバック用）
-- ============================================================
-- ②で置き換える前の定義。結果をコピーして手元に保存しておくこと。
-- 戻したくなったら、この出力をそのまま流せば元に戻る。
--
--   SELECT pg_get_functiondef(oid)
--   FROM   pg_proc
--   WHERE  proname = 'daily_review_candidates'
--   AND    pronamespace = 'public'::regnamespace;
--
-- 現在の cron ジョブも控える。ジョブ名が 'daily-review-push' 以外だと
-- ③が上書きではなく新規登録になり、二重に走る。
--
--   SELECT jobid, jobname, schedule, active FROM cron.job;
--   -- 期待: jobname = 'daily-review-push'、schedule = '0 23 * * *'


-- ============================================================
--  ② 対象者の絞り込みを差し替え — タイムゾーン不明者を除外
-- ============================================================
-- add-daily-review-sender.sql ④ からの変更は2箇所だけ:
--
--   left join pg_timezone_names   →  join pg_timezone_names
--   coalesce(tzn.name,'UTC')      →  tzn.name
--
-- ⚠️ 元の版は「NULL も不正な値も UTC に落とす」という判断だった。それは
--    候補から漏れる人を出さないための選択で、1日1回・JST だけの間は
--    実際に無害だった（UTC 扱いの人は現地8時が UTC 8時になり、23時にしか
--    回らない cron には最初から当たらなかったため）。
--
--    毎時に広げた瞬間、その判断は逆に働く。UTC 8時に必ず1回当たるように
--    なり、タイムゾーンが分からない学習者には現地の深夜に通知が飛ぶ。
--    深夜に起こされた人はプッシュそのものを切る。1通のために通知許可を
--    失うのは、送らないことよりはるかに高くつく。
--
-- ⚠️ 締め出しにはならない。profiles.timezone は TimezoneSyncer
--    (src/app/(app)/layout.tsx) がアプリを開くたびに書くので、除外された
--    学習者は次にアプリを開いた時点で自動的に対象へ戻る。適用時点で
--    除外されるのは、端末登録済み115人のうち1人だけだった。
--
-- ⚠️ inner join は不正なタイムゾーン名も同時に落とす。pg_timezone_names に
--    無い文字列（クライアントの Intl が返した見慣れない名前、DB の版が古い、
--    手で書き換えられた値）は NULL と同じ扱いになる。適用時点で該当0人。
--
-- ⚠️ p_user_id を渡す手動テストの経路も、タイムゾーン不明の学習者では
--    0行を返すようになる。届かない人を届く前提でテストできてしまうより、
--    そのほうが正しい。
--
-- ⚠️ 本体を1行にしてあるのは元ファイルと同じ理由。Supabase Dashboard の
--    SQL Editor に複数行の CREATE FUNCTION を貼ると文が壊れる。
--    整形して読みたいときは psql に流すこと。
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
as $function$ with due as (select p.id as uid, p.push_token as tok, p.preferred_language as lang, (now() at time zone tzn.name) as local_now from public.profiles p join pg_timezone_names tzn on tzn.name = p.timezone where p.daily_review_push = true and p.push_token is not null and (p_user_id is null or p.id = p_user_id)) select distinct on (due.uid) due.uid, due.tok, due.lang, e.id, e.natural_japanese, due.local_now::date from due join public.diary_entries e on e.user_id = due.uid and e.diary_date = (due.local_now::date - 1) and e.natural_japanese is not null and e.natural_japanese <> '' where (p_user_id is not null or extract(hour from due.local_now) = p_hour) and not exists (select 1 from public.dictation_attempts a where a.user_id = due.uid and a.diary_entry_id = e.id and a.usage_date = due.local_now::date) and not exists (select 1 from public.daily_review_sends s where s.user_id = due.uid and s.sent_date = due.local_now::date) order by due.uid, e.created_at desc $function$;


-- ============================================================
--  ③ 権限を再適用（べき等）
-- ============================================================
-- create or replace は既存の ACL を保持するので、厳密には不要。それでも
-- 書いてあるのは、このファイルだけを見た人が権限の状態を推測しなくて
-- 済むようにするため。理由は add-daily-review-sender.sql ⑤⑥ と同じ:
-- SECURITY DEFINER かつ RLS を通らないので、authenticated から呼べると
-- 全員分の push_token が読める。
revoke all on function public.daily_review_candidates(integer, uuid) from public, anon, authenticated;
grant execute on function public.daily_review_candidates(integer, uuid) to service_role;


-- ============================================================
--  ④ cron を毎時に広げる
-- ============================================================
-- add-daily-review-cron.sql ⑤ に置いてあった、コメントアウト済みの完成形。
-- 同じジョブ名で呼び直すと上書きされる（pg_cron 1.4+）ので、二重登録には
-- ならない。①でジョブ名を確認していない場合はここで止まること。
--
-- ⚠️ 本体は add-daily-review-cron.sql ④ と1文字も変えていない。変えたのは
--    スケジュールだけ。x-cron-secret は vault から読む形のままで、平文の
--    秘密が cron.job.command に残らないようにしてある。
select cron.schedule(
  'daily-review-push',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://nihongodiary.app/api/notifications/daily-review',
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
--  VERIFY — 適用直後
-- ============================================================
--   -- 除外された学習者の数（適用時点では 1）
--   SELECT count(*) AS excluded_users
--   FROM   public.profiles p
--   WHERE  p.daily_review_push = true
--   AND    p.push_token IS NOT NULL
--   AND    (p.timezone IS NULL
--           OR NOT EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = p.timezone));
--
--   -- いま毎時で回したら誰が対象になるか（送信はしない・現地時刻の分布）
--   SELECT g.h AS local_hour, count(*) AS candidates
--   FROM   generate_series(0,23) g(h),
--          LATERAL public.daily_review_candidates(g.h, NULL) c
--   GROUP  BY 1 ORDER BY 1;
--   -- 期待: 合計 10〜15、local_hour = 8 の行に集中
--
--   SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'daily-review-push';
--   -- 期待: 1行だけ、schedule = '0 * * * *'、active = true


-- ============================================================
--  VERIFY — 最初の毎時0分の直後
-- ============================================================
--   SELECT jobid, status, return_message, start_time
--   FROM   cron.job_run_details
--   WHERE  jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-review-push')
--   ORDER  BY start_time DESC LIMIT 10;
--   -- 期待: status = 'succeeded'
--
--   ★ ここが最重要
--   SELECT id, status_code, left(content, 200) AS body, created
--   FROM   net._http_response ORDER BY created DESC LIMIT 10;
--   -- 期待: status_code = 200
--   -- 403 → x-cron-secret 不一致（vault の secret 名 / Vercel の CRON_SECRET）
--   -- 404 → ルートが未デプロイ
--   -- 500 → CRON_SECRET が Vercel に未設定
--
--   ⚠️ cron.job_run_details が succeeded でも、HTTP が 403 なら1通も送られ
--      ない。pg_net は投げっぱなしで、ジョブ側は POST を「出した」ことしか
--      知らない。この差は net._http_response を見ないと分からない。


-- ============================================================
--  VERIFY — 翌日
-- ============================================================
--   SELECT sent_date, count(*) AS sent, min(sent_at) AS first_utc, max(sent_at) AS last_utc
--   FROM   public.daily_review_sends GROUP BY sent_date ORDER BY sent_date DESC LIMIT 7;
--   -- 期待: 直近の日が 10〜15 件（毎時化の前は 1 件）
--
--   SELECT date_trunc('hour', sent_at) AS utc_hour, count(*)
--   FROM   public.daily_review_sends
--   WHERE  sent_at > now() - interval '48 hours' GROUP BY 1 ORDER BY 1;
--   -- 期待: 複数の時間帯に分散し、12:00 UTC（米国東部の朝8時）に最多の山
--
--   SELECT user_id, sent_date, count(*)
--   FROM   public.daily_review_sends GROUP BY 1,2 HAVING count(*) > 1;
--   -- 期待: 0行（主キーがあるので出ようがないが、担保の確認として）
--
--   判断: 翌日が10件以上で 12:00 UTC 前後に山があれば成功。1〜3件のままなら
--   毎時回っていないので、cron.job_run_details が24時間で24行あるかを見る。


-- ============================================================
--  ROLLBACK
-- ============================================================
--   -- cron を1日1回に戻す（同名で上書き）
--   select cron.schedule('daily-review-push', '0 23 * * *', $$ 〈④と同じ本体〉 $$);
--
--   -- 通知そのものを止める
--   select cron.unschedule('daily-review-push');
--
--   -- 関数を戻す: ①で控えた pg_get_functiondef の出力をそのまま流す。
--   -- 控えていない場合は add-daily-review-sender.sql ④ を流し直せば、
--   -- left join + coalesce(tzn.name,'UTC') の版に戻る。
--
--   ⚠️ ロールバックしても daily_review_sends の行は消えない。消すと、
--      その日ぶんの「もう送った」判定が失われ、同じ学習者に2通目が飛ぶ。


-- ============================================================
--  NOTE — 毎時化で変わらないこと
-- ============================================================
-- 1通/日/人 は変わらない。cron の回数ではなく、daily_review_sends の
-- 主キーと「現地8時ちょうど」の条件が上限を決めているため。1人が該当する
-- のは1日のうち1時間だけで、その1時間に insert が1行入る。
--
-- 届く人が増えない場合、次に見るべきは cron ではなく手前の条件になる。
-- 適用時点の実測では、端末登録済み115人のうち99人が「現地の昨日に添削済み
-- の日記が無い」で落ちている。これは仕様どおりの動作（毎日書く人にだけ
-- 届く）で、通知の設定ではなく日記の継続率の問題。
--
-- hasDictation() による絞り込み（ルート側、SQL では再現していない）で
-- 落ちたのは24時間分を通して0人。採点できない日記はほとんど無い。
