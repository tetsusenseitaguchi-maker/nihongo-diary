-- ============================================================
--  Nihongo Diary — 翌朝の復習通知：定時実行の登録
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  ①〜⑤ の順に1文ずつ実行する。
--
--  ⚠️⚠️ 実行のタイミング ⚠️⚠️
--  このファイルは /api/notifications/daily-review が本番にデプロイされて
--  から流すこと。先に流すと、毎時 404 を叩き続けるジョブが動き出す。
--  add-daily-review-sender.sql のほうは先に流してよい（呼ばれるまで
--  何も起きない）。
--
--  設計:
--    - pg_cron には判定を一切持たせない。毎時ルートを1回叩くだけの
--      引き金にする。誰に送るかはアプリ側（SQL 関数 + TS）が決める。
--      ジョブ定義に条件を書くと、変更履歴の残らない場所にロジックが溜まる。
--    - 秘密鍵はジョブ定義に直書きせず Vault に置く（②の理由を参照）。
--    - 既存の通知経路（/api/push/send を叩く Database Webhook、Obie）には
--      触らない。あちらはイベント起点、こちらは時刻起点で、経路が別。
--    - profiles / notifications / 既存トリガーには触らない。
-- ============================================================


-- ============================================================
--  ① 拡張を有効化 — pg_cron
-- ============================================================
-- Dashboard → Database → Extensions のトグルでも同じ。既に有効なら
-- if not exists で何も起きない。
create extension if not exists pg_cron;


-- ============================================================
--  ② 拡張を有効化 — pg_net
-- ============================================================
-- HTTP を投げるのに要る。スキーマ net が作られ、net.http_post が生える。
create extension if not exists pg_net;


-- ============================================================
--  ③ 秘密鍵を Vault に入れる
-- ============================================================
-- ⚠️ cron.schedule の第3引数はそのまま cron.job.command に平文で残る。
--    秘密鍵を直書きすると、DB を読める人全員に見える。Vault に入れて
--    参照だけを置く。
--
-- 値は Vercel の CRON_SECRET と完全に同じ文字列にすること。
-- 生成例:  openssl rand -base64 32
--
-- ⚠️ create_secret は同じ name で2回目を呼ぶと落ちる。回すときは
--    下の update_secret を使う。
select vault.create_secret('REPLACE_WITH_CRON_SECRET', 'daily_review_secret');

-- 鍵を回すとき（初回は実行しない）:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'daily_review_secret'),
--     'REPLACE_WITH_NEW_SECRET'
--   );


-- ============================================================
--  ④ ジョブを登録 — まずは1時間だけ
-- ============================================================
-- ⚠️ 最初から '0 * * * *'（毎時）にしないこと。1日は自分のローカル8時に
--    当たる1時間だけで観察し、届き方・件数・重複が期待どおりだと
--    確認してから⑤で広げる。
--
-- cron の時刻は UTC。ローカル8時に当たる UTC 時刻は:
--   JST (UTC+9)  → 23時（前日）  '0 23 * * *'
--   CET (UTC+1)  →  7時          '0 7 * * *'
--   EST (UTC-5)  → 13時          '0 13 * * *'
-- 下の例は JST。自分のタイムゾーンに合わせて書き換えること。
--
-- 同じジョブ名で呼び直すと上書きされる（pg_cron 1.4+）。⑤で広げるときも
-- 同じ文をスケジュールだけ変えて流せばよい。
select cron.schedule(
  'daily-review-push',
  '0 23 * * *',
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
--  ⑤ 毎時に広げる（1日観察してから）
-- ============================================================
-- ⚠️ ④で1日動かし、VERIFY を確認してから実行する。
--    ここを流した時点で、世界中のどのタイムゾーンの学習者にも
--    それぞれのローカル8時に届くようになる。
--
-- select cron.schedule(
--   'daily-review-push',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url     := 'https://nihongodiary.app/api/notifications/daily-review',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
--                         where name = 'daily_review_secret')
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );


-- ============================================================
--  VERIFY
-- ============================================================
-- (1) ジョブが登録されていること
--   SELECT jobid, jobname, schedule, active FROM cron.job
--   WHERE jobname = 'daily-review-push';
--   期待: 1行、active = true、schedule が意図したもの
--
-- (2) ★重要★ 秘密鍵がジョブ定義に平文で入っていないこと
--   SELECT command FROM cron.job WHERE jobname = 'daily-review-push';
--   期待: vault.decrypted_secrets への参照が見えるだけで、鍵そのものは
--         現れない。鍵の文字列が見えたら③をやり直すこと。
--
-- (3) 鍵が読めること
--   SELECT name, length(decrypted_secret) AS len
--   FROM vault.decrypted_secrets WHERE name = 'daily_review_secret';
--   期待: 1行、len が生成した鍵の長さと一致
--   （decrypted_secret そのものを SELECT して画面に出さないこと。）
--
-- (4) 実行されたか
--   SELECT jobid, status, return_message, start_time
--   FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname='daily-review-push')
--   ORDER BY start_time DESC LIMIT 10;
--   期待: status = 'succeeded'
--   ⚠️ ここが succeeded でも「HTTP が成功した」意味ではない。pg_net は
--      投げっぱなしなので、ジョブ側は投げた時点で成功になる。応答は (5)。
--
-- (5) ★実際に届いたか★ HTTP の応答
--   SELECT id, status_code, content, created
--   FROM net._http_response ORDER BY created DESC LIMIT 10;
--   期待: status_code = 200
--     401 → x-cron-secret が Vercel の CRON_SECRET と一致していない
--     404 → ルートが未デプロイ。④を unschedule して待つこと
--     500 → ルート側のエラー。Vercel のログを見る
--
-- (6) 実際に送った記録
--   SELECT * FROM public.daily_review_sends ORDER BY sent_at DESC LIMIT 20;
--   期待: 1人1日1行だけ。同じ user_id で同じ sent_date が2行あることは
--         主キーによりありえない。


-- ============================================================
--  ROLLBACK / 一時停止
-- ============================================================
-- 止める（登録は残す。すぐ戻せる）:
--   UPDATE cron.job SET active = false WHERE jobname = 'daily-review-push';
--
-- 登録ごと消す:
--   SELECT cron.unschedule('daily-review-push');
--
-- 鍵も消す:
--   DELETE FROM vault.secrets WHERE name = 'daily_review_secret';
--
-- ⚠️ 拡張（pg_cron / pg_net）は drop しないこと。他の用途で使われて
--    いる可能性があり、この機能だけのために消すものではない。
--
-- ⚠️ 通知を止めたいだけなら、まず active = false を使う。unschedule と
--    違って、戻すのに③の鍵やスケジュール文を打ち直さずに済む。


-- ============================================================
--  NOTE — 既存の Database Webhook と混ざらないこと
-- ============================================================
-- 既に notifications への INSERT を /api/push/send に飛ばす Database
-- Webhook が動いている。あれはイベント起点で、フォロー・コメント・
-- リアクション・返信の5種類だけを送る（PUSH_COPY、push/send/route.ts:29）。
--
-- こちらは時刻起点で、notifications には1行も書かない。したがって
-- 2つの経路が同じ通知を二重に送ることはない。
--
-- ⚠️ 将来ベルにも出したくなって notifications に行を入れる場合、その
--    type が PUSH_COPY に載っていなければ Webhook は素通りする（設計上
--    そうなっている）。載せてしまうと、こちらの sendPush と Webhook の
--    両方が発火して二重に届く。載せないこと。
-- ============================================================
